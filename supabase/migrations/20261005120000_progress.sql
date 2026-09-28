-- Step 7: progress. Derived, not stored (docs/data-model.md): these read set_logs and run as the
-- caller (security invoker), so RLS applies.

-- One row per completed session per exercise from p_since on: the best working set (Epley e1RM,
-- as exercise_bests), volume, set and rep counts, and the best e1RM of every earlier session of
-- that exercise (all history, not just from p_since). A PR is best_e1rm_kg > prev_best_e1rm_kg;
-- the first weighted session has no prev_best, so it sets the baseline. Oldest first.
create or replace function public.exercise_session_bests(p_since date, p_exercise_id uuid default null)
returns table (
  session_id uuid, exercise_id uuid, performed_on date, session_name text,
  best_weight_kg numeric, best_reps int, best_e1rm_kg numeric, volume_kg numeric,
  working_sets int, total_reps int, prev_best_e1rm_kg numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with w as (
    select s.id as session_id, se.exercise_id, s.scheduled_date as performed_on,
      s.name as session_name, coalesce(s.started_at, s.ended_at) as at, l.weight_kg, l.reps,
      case
        when coalesce(l.weight_kg, 0) <= 0 then 0
        when l.reps = 1 then l.weight_kg
        else l.weight_kg * (1 + l.reps / 30.0)
      end as e1rm
    from public.set_logs l
    join public.session_exercises se on se.id = l.session_exercise_id
    join public.sessions s on s.id = se.session_id
    where s.user_id = auth.uid() and s.status = 'completed' and l.completed_at is not null
      and l.set_type <> 'warmup' and l.reps > 0
      and (p_exercise_id is null or se.exercise_id = p_exercise_id)
  ),
  per as (
    select session_id, exercise_id, performed_on, session_name, at,
      (array_agg(weight_kg order by e1rm desc, weight_kg desc nulls last, reps desc))[1] as best_weight_kg,
      (array_agg(reps order by e1rm desc, weight_kg desc nulls last, reps desc))[1] as best_reps,
      max(e1rm) as best_e1rm_kg,
      sum(coalesce(weight_kg, 0) * reps) as volume_kg,
      count(*)::int as working_sets,
      sum(reps)::int as total_reps
    from w
    group by session_id, exercise_id, performed_on, session_name, at
  ),
  ranked as (
    select per.*,
      max(nullif(best_e1rm_kg, 0)) over (
        partition by exercise_id order by performed_on, at, session_id
        rows between unbounded preceding and 1 preceding
      ) as prev_best_e1rm_kg
    from per
  )
  select session_id, exercise_id, performed_on, session_name, best_weight_kg, best_reps,
    round(best_e1rm_kg, 2), round(volume_kg, 2), working_sets, total_reps,
    round(prev_best_e1rm_kg, 2)
  from ranked
  where performed_on >= p_since
  order by performed_on, at, session_id;
$$;

-- The last p_limit completed sessions of one exercise, newest first, with their completed sets
-- (warm-ups included, marked by set_type) in logged order.
create or replace function public.exercise_history(p_exercise_id uuid, p_limit int default 30)
returns table (session_id uuid, performed_on date, session_name text, sets jsonb)
language sql
stable
security invoker
set search_path = ''
as $$
  select s.id, s.scheduled_date, s.name,
    jsonb_agg(
      jsonb_build_object(
        'set_number', l.set_number, 'set_type', l.set_type, 'weight_kg', l.weight_kg,
        'reps', l.reps, 'rpe', l.rpe
      )
      order by se.position, l.set_number
    )
  from public.sessions s
  join public.session_exercises se on se.session_id = s.id
  join public.set_logs l on l.session_exercise_id = se.id
  where s.user_id = auth.uid() and s.status = 'completed' and se.exercise_id = p_exercise_id
    and l.completed_at is not null
  group by s.id
  order by s.scheduled_date desc, coalesce(s.started_at, s.ended_at) desc nulls last, s.id
  limit greatest(1, least(coalesce(p_limit, 30), 200));
$$;

revoke execute on function public.exercise_session_bests(date, uuid) from public, anon;
revoke execute on function public.exercise_history(uuid, int) from public, anon;
grant execute on function public.exercise_session_bests(date, uuid) to authenticated;
grant execute on function public.exercise_history(uuid, int) to authenticated;
