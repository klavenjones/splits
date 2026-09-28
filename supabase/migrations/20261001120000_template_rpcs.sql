-- Step 3: save and duplicate templates in one transaction. Both run as the caller (security
-- invoker), so the RLS policies on templates / template_exercises / template_run_segments apply.

-- Inserts (p_id null) or updates a template and replaces all of its children from JSON arrays.
-- Positions come from array order. Superset and repeat groups must be contiguous; a repeat
-- block's members must share one `repeats`; each segment's target must match its target_type
-- (target columns that don't apply are cleared).
create or replace function public.save_template(
  p_id uuid,
  p_name text,
  p_kind public.workout_kind,
  p_notes text,
  p_est_duration_s int,
  p_est_distance_m int,
  p_exercises jsonb,
  p_segments jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  if p_id is null then
    insert into public.templates (user_id, name, kind, notes, est_duration_s, est_distance_m)
    values (v_uid, trim(p_name), p_kind, nullif(trim(p_notes), ''), p_est_duration_s, p_est_distance_m)
    returning id into v_id;
  else
    update public.templates
    set name = trim(p_name), kind = p_kind, notes = nullif(trim(p_notes), ''),
        est_duration_s = p_est_duration_s, est_distance_m = p_est_distance_m
    where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'template not found' using errcode = 'P0002';
    end if;
    delete from public.template_exercises where template_id = v_id;
    delete from public.template_run_segments where template_id = v_id;
  end if;

  if p_kind = 'lift' then
    insert into public.template_exercises
      (template_id, exercise_id, position, superset_group, target_sets, rep_min, rep_max, rest_sec, notes)
    select v_id, (e ->> 'exercise_id')::uuid, (ord - 1)::int, (e ->> 'superset_group')::int,
           (e ->> 'target_sets')::int, (e ->> 'rep_min')::int, (e ->> 'rep_max')::int,
           (e ->> 'rest_sec')::int, nullif(trim(e ->> 'notes'), '')
    from jsonb_array_elements(coalesce(p_exercises, '[]'::jsonb)) with ordinality as x (e, ord);

    if not exists (select 1 from public.template_exercises where template_id = v_id) then
      raise exception 'a lift template needs at least one exercise' using errcode = '22023';
    end if;
    if exists (
      select 1 from public.template_exercises
      where template_id = v_id and superset_group is not null
      group by superset_group
      having max(position) - min(position) + 1 <> count(*)
    ) then
      raise exception 'superset members must be next to each other' using errcode = '22023';
    end if;
  else
    insert into public.template_run_segments
      (template_id, position, segment_type, repeat_group, repeats, distance_m, duration_s,
       target_type, target_pace_s_per_km, target_pace_tolerance_s, target_hr_zone, target_effort,
       voice_cues)
    select v_id, (ord - 1)::int, (s ->> 'segment_type')::public.segment_type,
           (s ->> 'repeat_group')::int,
           case when s ->> 'repeat_group' is null then 1 else coalesce((s ->> 'repeats')::int, 1) end,
           (s ->> 'distance_m')::int, (s ->> 'duration_s')::int,
           coalesce((s ->> 'target_type')::public.target_type, 'none'),
           case when s ->> 'target_type' = 'pace' then (s ->> 'target_pace_s_per_km')::int end,
           case when s ->> 'target_type' = 'pace'
                then coalesce((s ->> 'target_pace_tolerance_s')::int, 0) else 0 end,
           case when s ->> 'target_type' = 'heart_rate_zone' then (s ->> 'target_hr_zone')::int end,
           case when s ->> 'target_type' = 'effort' then s ->> 'target_effort' end,
           coalesce(array(select jsonb_array_elements_text(s -> 'voice_cues')), '{}')
    from jsonb_array_elements(coalesce(p_segments, '[]'::jsonb)) with ordinality as x (s, ord);

    if not exists (select 1 from public.template_run_segments where template_id = v_id) then
      raise exception 'a run template needs at least one segment' using errcode = '22023';
    end if;
    if exists (
      select 1 from public.template_run_segments
      where template_id = v_id and repeat_group is not null
      group by repeat_group
      having max(position) - min(position) + 1 <> count(*) or count(distinct repeats) <> 1
    ) then
      raise exception 'a repeat block must be contiguous with one repeat count' using errcode = '22023';
    end if;
    if exists (
      select 1 from public.template_run_segments
      where template_id = v_id and (
        (target_type = 'pace' and target_pace_s_per_km is null)
        or (target_type = 'heart_rate_zone' and target_hr_zone is null)
        or (target_type = 'effort' and target_effort is null))
    ) then
      raise exception 'each segment target needs a value' using errcode = '22023';
    end if;
  end if;

  return v_id;
end;
$$;

-- Copies a template and its children as "{name} copy".
create or replace function public.duplicate_template(p_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.templates (user_id, name, kind, notes, est_duration_s, est_distance_m)
  select user_id, left(name, 55) || ' copy', kind, notes, est_duration_s, est_distance_m
  from public.templates
  where id = p_id and user_id = auth.uid()
  returning id into v_id;
  if v_id is null then
    raise exception 'template not found' using errcode = 'P0002';
  end if;

  insert into public.template_exercises
    (template_id, exercise_id, position, superset_group, target_sets, rep_min, rep_max, rest_sec, notes)
  select v_id, exercise_id, position, superset_group, target_sets, rep_min, rep_max, rest_sec, notes
  from public.template_exercises where template_id = p_id;

  insert into public.template_run_segments
    (template_id, position, segment_type, repeat_group, repeats, distance_m, duration_s, target_type,
     target_pace_s_per_km, target_pace_tolerance_s, target_hr_zone, target_effort, voice_cues)
  select v_id, position, segment_type, repeat_group, repeats, distance_m, duration_s, target_type,
         target_pace_s_per_km, target_pace_tolerance_s, target_hr_zone, target_effort, voice_cues
  from public.template_run_segments where template_id = p_id;

  return v_id;
end;
$$;

revoke execute on function public.save_template(uuid, text, public.workout_kind, text, int, int, jsonb, jsonb)
  from public, anon;
revoke execute on function public.duplicate_template(uuid) from public, anon;
grant execute on function public.save_template(uuid, text, public.workout_kind, text, int, int, jsonb, jsonb)
  to authenticated;
grant execute on function public.duplicate_template(uuid) to authenticated;
