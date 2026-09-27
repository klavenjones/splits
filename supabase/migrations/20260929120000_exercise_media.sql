-- Step 2: exercise library. Index for "built-in or mine" reads, and the private bucket for
-- custom-exercise photos and videos (docs/data-model.md: exercise-media/{user_id}/…).

create index if not exists exercises_owner_id_idx on public.exercises (owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exercise-media',
  'exercise-media',
  false,
  52428800, -- 50 MB
  array['image/jpeg', 'image/png', 'image/heic', 'video/mp4', 'video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Each user reads and writes only objects under their own folder: {user_id}/{file}.
create policy "exercise-media: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'exercise-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "exercise-media: insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'exercise-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "exercise-media: update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'exercise-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'exercise-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "exercise-media: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'exercise-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
