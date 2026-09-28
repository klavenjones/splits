-- Step 8: run the weekly check-in Edge Function every 15 minutes (some time zones are offset by
-- :30 or :45). The function works out each user's local time from users.timezone and proposes
-- targets only when their check-in is due; it's idempotent (one row per user and week).
-- Vault holds the project URL and the anon key (public; the app ships it) under the names below.
-- They're created outside migrations so no key is committed:
--   select vault.create_secret('<project url>', 'project_url');
--   select vault.create_secret('<anon key>', 'anon_key');
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname = 'weekly-checkin';
select cron.schedule(
  'weekly-checkin',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/weekly-checkin',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);
