-- Exercise notes smoke test. Run as postgres (SQL editor, or `npx supabase db query --linked -f`).
-- One transaction, rolled back. Raises an exception on the first failure.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000005a1', 'notes-a@example.test'),
  ('00000000-0000-0000-0000-0000000005b1', 'notes-b@example.test');

create temporary table smoke (k text primary key, v uuid) on commit drop;
grant all on smoke to authenticated;
insert into smoke select 'ex', id from public.exercises where owner_id is null limit 1;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005a1","role":"authenticated"}', true);

do $$
declare ex uuid := (select v from smoke where k = 'ex');
begin
  -- A notes a built-in exercise; the text is trimmed.
  perform public.save_exercise_note(ex, '  seat height 4  ', '2026-10-16 10:00+00');
  if (select note from public.exercise_notes where exercise_id = ex) <> 'seat height 4' then
    raise exception 'note not saved or not trimmed';
  end if;

  -- An older write (a late retry) does not replace a newer note.
  perform public.save_exercise_note(ex, 'older', '2026-10-16 09:00+00');
  if (select note from public.exercise_notes where exercise_id = ex) <> 'seat height 4' then
    raise exception 'older write replaced a newer note';
  end if;

  -- A newer write replaces it.
  perform public.save_exercise_note(ex, 'seat height 5', '2026-10-16 11:00+00');
  if (select note from public.exercise_notes where exercise_id = ex) <> 'seat height 5' then
    raise exception 'newer write did not replace the note';
  end if;

  -- Notes are capped at 500 characters by the table.
  begin
    insert into public.exercise_notes (user_id, exercise_id, note)
    values (auth.uid(), ex, repeat('x', 501));
    raise exception 'a 501-character note was accepted';
  exception when check_violation or unique_violation then
    null;
  end;
end $$;

-- B cannot see A's note, and cannot write a row for A.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000005b1","role":"authenticated"}', true);

do $$
declare ex uuid := (select v from smoke where k = 'ex');
begin
  if exists (select 1 from public.exercise_notes) then
    raise exception 'B can see A''s note';
  end if;
  begin
    insert into public.exercise_notes (user_id, exercise_id, note)
    values ('00000000-0000-0000-0000-0000000005a1', ex, 'forged');
    raise exception 'B wrote a note as A';
  exception when insufficient_privilege or check_violation then
    null;
  end;

  -- B's own note is independent, and clearing it deletes the row.
  perform public.save_exercise_note(ex, 'mine', '2026-10-16 12:00+00');
  if (select count(*) from public.exercise_notes) <> 1 then
    raise exception 'B should see exactly their own note';
  end if;
  perform public.save_exercise_note(ex, '   ', '2026-10-16 13:00+00');
  if exists (select 1 from public.exercise_notes) then
    raise exception 'an empty note did not delete the row';
  end if;
end $$;

rollback;
select 'exercise_notes smoke test passed' as result;
