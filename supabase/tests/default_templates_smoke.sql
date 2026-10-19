-- Default templates smoke test. Run as postgres (SQL editor, or `npx supabase db query --linked -f`).
-- One transaction, rolled back. Raises an exception on the first failure.
begin;

-- Sign-up runs handle_new_user, which seeds the defaults.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000004a1', 'defaults-a@example.test');

do $$
declare
  v_user uuid := '00000000-0000-0000-0000-0000000004a1';
  v_counts int[];
begin
  select array_agg(n order by name) into v_counts from (
    select t.name, count(te.id)::int n
    from public.templates t join public.template_exercises te on te.template_id = t.id
    where t.user_id = v_user and t.kind = 'lift'
    group by t.name
  ) x;
  -- By name: All Patterns Fri / Mon / Wed, then Hybrid Fri / Mon / Wed.
  if v_counts is distinct from array[8, 8, 10, 7, 5, 7] then
    raise exception 'expected the six defaults, got %', v_counts;
  end if;

  if not exists (
    select 1 from public.templates t
    join public.template_exercises te on te.template_id = t.id
    join public.exercises e on e.id = te.exercise_id
    where t.user_id = v_user and t.name = 'Hybrid · Mon Heavy Strength' and te.position = 0
      and e.name = 'squat' and te.target_sets = 4 and te.rep_min = 5 and te.rep_max = 5
      and te.rest_sec = 150 and te.notes = 'back squat'
  ) then
    raise exception 'Hybrid Mon should open with 4 × 5 back squat, 150 s rest';
  end if;

  -- Seeding again adds nothing.
  perform public.seed_default_templates(v_user);
  if (select count(*) from public.templates where user_id = v_user) <> 6 then
    raise exception 'seeding twice duplicated templates';
  end if;
end $$;

-- The user sees and owns them under RLS.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000004a1","role":"authenticated"}', true);

do $$
begin
  if (select count(*) from public.templates) <> 6 then
    raise exception 'user should see their six default templates';
  end if;
  update public.templates set name = 'my squat day' where name = 'Hybrid · Mon Heavy Strength';
  if not found then
    raise exception 'user should be able to edit a default template';
  end if;
end $$;

-- Users can't call the seeder themselves.
do $$
begin
  perform public.seed_default_templates(auth.uid());
  raise exception 'authenticated should not be able to call seed_default_templates';
exception when insufficient_privilege then
  null;
end $$;

reset role;
rollback;
