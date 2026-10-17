-- A private note per user per exercise (built-in or custom), e.g. "seat height 4". Built-in
-- exercises are read-only, so the note lives in its own table. Written through
-- save_exercise_note so a note edited offline can be sent again safely.

create table public.exercise_notes (
  user_id uuid not null references public.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  note text not null check (char_length(note) between 1 and 500),
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

alter table public.exercise_notes enable row level security;

create policy "exercise_notes: own rows" on public.exercise_notes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Notes already written on custom exercises (exercises.notes) move over; that column stays but
-- the app no longer writes it.
insert into public.exercise_notes (user_id, exercise_id, note)
select e.owner_id, e.id, left(btrim(e.notes), 500)
from public.exercises e
where e.owner_id is not null and nullif(btrim(e.notes), '') is not null
on conflict do nothing;

-- Saves (or, when the note is empty, clears) the caller's note. An older write never replaces a
-- newer one, so retries and out-of-order syncs are safe.
create or replace function public.save_exercise_note(
  p_exercise_id uuid,
  p_note text,
  p_updated_at timestamptz default now()
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  if v_note is null then
    delete from public.exercise_notes
    where user_id = auth.uid() and exercise_id = p_exercise_id and updated_at <= p_updated_at;
    return;
  end if;

  insert into public.exercise_notes (user_id, exercise_id, note, updated_at)
  values (auth.uid(), p_exercise_id, left(v_note, 500), p_updated_at)
  on conflict (user_id, exercise_id) do update
    set note = excluded.note, updated_at = excluded.updated_at
    where public.exercise_notes.updated_at <= excluded.updated_at;
end;
$$;

revoke execute on function public.save_exercise_note(uuid, text, timestamptz) from public, anon;
grant execute on function public.save_exercise_note(uuid, text, timestamptz) to authenticated;
