-- Exercise library smoke test. Run as postgres (SQL editor, or `npx supabase db query --linked -f`).
-- One transaction, rolled back. Raises an exception on the first failure.
begin;

-- The built-in library: at least 150 rows, no owner, vocabulary values only.
do $$
declare bad text;
begin
  if (select count(*) from public.exercises where owner_id is null) < 150 then
    raise exception 'expected at least 150 built-in exercises, found %',
      (select count(*) from public.exercises where owner_id is null);
  end if;
  select string_agg(name, ', ') into bad from public.exercises
  where owner_id is null and (
    primary_muscle not in ('chest', 'upper chest', 'lats', 'upper back', 'lower back', 'traps',
      'front delts', 'side delts', 'rear delts', 'biceps', 'triceps', 'forearms', 'quads',
      'hamstrings', 'glutes', 'calves', 'adductors', 'abductors', 'abs', 'obliques', 'full body')
    or equipment not in ('barbell', 'dumbbell', 'kettlebell', 'cable', 'machine', 'bodyweight',
      'band', 'landmine', 'ez bar', 'smith machine', 'sled', 'box', 'rower', 'bike', 'other')
    or jsonb_array_length(instructions -> 'steps') < 3);
  if bad is not null then
    raise exception 'built-ins with bad vocabulary or no steps: %', bad;
  end if;
end $$;

-- Built-in media: every built-in with an image carries its license credit.
do $$
begin
  if exists (select 1 from public.exercises
             where owner_id is null and thumbnail_url is not null
               and (media_credit ->> 'author' is null or media_credit ->> 'license_url' is null)) then
    raise exception 'built-in exercise media without a credit';
  end if;
end $$;

insert into storage.objects (bucket_id, name) values ('exercise-media', 'builtin/smoke-test.png');

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000002a1', 'library-a@example.test'),
  ('00000000-0000-0000-0000-0000000002b1', 'library-b@example.test');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000002a1","role":"authenticated"}', true);

-- A creates a custom exercise with a video in their own folder.
insert into storage.objects (bucket_id, name)
values ('exercise-media', '00000000-0000-0000-0000-0000000002a1/clip.mp4');
insert into public.exercises (owner_id, name, primary_muscle, secondary_muscles, equipment,
  tracking_type, demo_url, demo_type)
values ('00000000-0000-0000-0000-0000000002a1', 'landmine press smoke', 'front delts',
  '{triceps,upper chest}', 'landmine', 'weight_reps',
  '00000000-0000-0000-0000-0000000002a1/clip.mp4', 'video');

do $$
begin
  if (select count(*) from public.exercises where name = 'landmine press smoke') <> 1 then
    raise exception 'A cannot read their own custom exercise';
  end if;
  if (select count(*) from public.exercises where owner_id is null) < 150 then
    raise exception 'A cannot read the built-in library';
  end if;
  -- Same name twice for the same owner is rejected.
  begin
    insert into public.exercises (owner_id, name)
    values ('00000000-0000-0000-0000-0000000002a1', 'Landmine Press Smoke');
    raise exception 'duplicate custom name was allowed';
  exception when unique_violation then null;
  end;
  -- Built-ins are read-only.
  update public.exercises set notes = 'mine now' where owner_id is null;
  if exists (select 1 from public.exercises where owner_id is null and notes = 'mine now') then
    raise exception 'A updated a built-in exercise';
  end if;
  -- A cannot write into someone else's media folder.
  begin
    insert into storage.objects (bucket_id, name)
    values ('exercise-media', '00000000-0000-0000-0000-0000000002b1/sneaky.mp4');
    raise exception 'A wrote into B''s media folder';
  exception when insufficient_privilege then null;
  end;
end $$;

-- B sees the library but none of A's exercise or media.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000002b1","role":"authenticated"}', true);

do $$
begin
  if exists (select 1 from public.exercises where name = 'landmine press smoke') then
    raise exception 'B can read A''s custom exercise';
  end if;
  if (select count(*) from public.exercises where owner_id is null) < 150 then
    raise exception 'B cannot read the built-in library';
  end if;
  if exists (select 1 from storage.objects
             where bucket_id = 'exercise-media'
               and name like '00000000-0000-0000-0000-0000000002a1/%') then
    raise exception 'B can see A''s media';
  end if;
  if not exists (select 1 from storage.objects where name = 'builtin/smoke-test.png') then
    raise exception 'B cannot read built-in media';
  end if;
  -- Nobody but the service role writes built-in media.
  begin
    insert into storage.objects (bucket_id, name) values ('exercise-media', 'builtin/sneaky.png');
    raise exception 'B wrote into builtin/';
  exception when insufficient_privilege then null;
  end;
  update public.exercises set name = 'hijacked' where name = 'landmine press smoke';
  update storage.objects set name = '00000000-0000-0000-0000-0000000002b1/stolen.mp4'
  where bucket_id = 'exercise-media';
  update storage.objects set name = 'builtin/renamed.png' where name = 'builtin/smoke-test.png';
end $$;

reset role;
do $$
begin
  if not exists (select 1 from public.exercises where name = 'landmine press smoke')
     or not exists (select 1 from storage.objects
       where name = '00000000-0000-0000-0000-0000000002a1/clip.mp4')
     or not exists (select 1 from storage.objects where name = 'builtin/smoke-test.png') then
    raise exception 'B changed A''s exercise or media';
  end if;
end $$;

select 'exercise library smoke test passed' as result;
rollback;
