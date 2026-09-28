// Weekly check-in (Deno Edge Function), called every 15 minutes by pg_cron
// (migration 20261006120100_checkin_schedule.sql). For each user with a nutrition profile it
// works out the local time from users.timezone and, when their check-in is due and this week has
// no targets row, runs the same engine as the app and inserts a `proposed` row. Idempotent: the
// (user_id, week_start) unique makes the phone's fallback and this job insert once between them.
import { createClient } from 'npm:@supabase/supabase-js@2';

import {
  dueWeek,
  localTime,
  proposeTargets,
  type DayRecord,
  type NutritionProfile,
} from '../_shared/checkin.ts';

type Row = NutritionProfile & {
  user_id: string;
  users: { timezone: string; checkin_weekday: number; onboarding_completed_at: string | null };
};

Deno.serve(async () => {
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
  const now = new Date();
  const { data: profiles, error } = await admin
    .from('nutrition_profiles')
    .select(
      'user_id, sex, experience, goal, phase, rate_mode, weekly_rate_pct, start_date, start_weight_kg, start_body_fat_pct, users!inner(timezone, checkin_weekday, onboarding_completed_at)',
    );
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  let checked = 0;
  let proposed = 0;
  const failures: string[] = [];
  for (const p of (profiles ?? []) as unknown as Row[]) {
    checked++;
    try {
      if (!p.users.onboarding_completed_at) continue;
      const local = localTime(now, p.users.timezone || 'UTC');
      const candidate = dueWeek({
        now: local,
        checkinWeekday: p.users.checkin_weekday ?? 1,
        startDate: p.start_date,
        hasRow: () => false,
      });
      if (!candidate) continue;
      const exists = await admin
        .from('weekly_targets')
        .select('id')
        .eq('user_id', p.user_id)
        .eq('week_start', candidate)
        .maybeSingle();
      if (exists.error) throw exists.error;
      if (exists.data) continue;

      const [checkins, logs] = await Promise.all([
        admin
          .from('body_checkins')
          .select('checkin_date, weight_kg, body_fat_pct')
          .eq('user_id', p.user_id)
          .gte('checkin_date', p.start_date)
          .lt('checkin_date', candidate),
        admin
          .from('food_logs')
          .select('log_date, kcal')
          .eq('user_id', p.user_id)
          .gte('log_date', p.start_date)
          .lt('log_date', candidate),
      ]);
      if (checkins.error) throw checkins.error;
      if (logs.error) throw logs.error;

      const days = new Map<string, DayRecord>();
      const day = (date: string) => {
        let d = days.get(date);
        if (!d) days.set(date, (d = { date, weightKg: null, kcal: null, bodyFatPct: null }));
        return d;
      };
      for (const c of checkins.data ?? []) {
        const d = day(c.checkin_date);
        d.weightKg = c.weight_kg === null ? null : Number(c.weight_kg);
        d.bodyFatPct = c.body_fat_pct === null ? null : Number(c.body_fat_pct);
      }
      for (const l of logs.data ?? []) {
        const d = day(l.log_date);
        d.kcal = (d.kcal ?? 0) + Number(l.kcal);
      }

      const out = proposeTargets(p, candidate, [...days.values()]);
      if (!out) continue;
      const { error: insertError, count } = await admin
        .from('weekly_targets')
        .upsert(
          { ...out.proposal, user_id: p.user_id, method: 'adaptive', status: 'proposed' },
          { onConflict: 'user_id,week_start', ignoreDuplicates: true, count: 'exact' },
        );
      if (insertError) throw insertError;
      if (count) proposed++;
    } catch (e) {
      failures.push(p.user_id);
      console.error('check-in failed', p.user_id, e);
    }
  }
  return new Response(JSON.stringify({ checked, proposed, failed: failures.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
