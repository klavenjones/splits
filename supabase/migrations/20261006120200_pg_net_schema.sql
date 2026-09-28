-- pg_net was created in public (advisor 0014); it isn't relocatable, so recreate it in
-- `extensions`. Its functions live in the `net` schema either way, so the cron job is unchanged.
drop extension if exists pg_net;
create extension pg_net with schema extensions;
