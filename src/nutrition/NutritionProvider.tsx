import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/auth';
import { supabase } from '@/db/client';
import { asEngineProfile, fetchDays } from '@/db/queries/nutrition';
import { profileKey } from '@/db/queries/profile';
import { toLocalDate } from '@/engine/calendar';
import { dueWeek, proposeTargets, type LocalTime } from '@/engine/checkin';

/** The phone's local time, in the shape the check-in rules use. */
export function deviceTime(now = new Date()): LocalTime {
  return {
    date: toLocalDate(now),
    weekday: ((now.getDay() + 6) % 7) + 1,
    minutes: now.getHours() * 60 + now.getMinutes(),
  };
}

let running = false;

/**
 * The on-device fallback for the weekly check-in: when it's due in local time and the scheduled
 * function hasn't proposed this week's targets yet, run the same engine here and propose them.
 * Whichever gets there first inserts the row; the other does nothing (unique week).
 */
export async function runCheckinIfDue(userId: string, checkinWeekday: number, qc: QueryClient) {
  if (running) return;
  running = true;
  try {
    const profile = await supabase
      .from('nutrition_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (profile.error || !profile.data) return;
    const p = asEngineProfile(profile.data);
    const week = dueWeek({
      now: deviceTime(),
      checkinWeekday,
      startDate: p.start_date,
      hasRow: () => false,
    });
    if (!week) return;
    const existing = await supabase
      .from('weekly_targets')
      .select('id')
      .eq('week_start', week)
      .maybeSingle();
    if (existing.error || existing.data) return;
    const out = proposeTargets(p, week, await fetchDays(p.start_date, week));
    if (!out) return;
    const { data: inserted, error } = await supabase.rpc('propose_weekly_targets', {
      p: out.proposal,
    });
    if (error) throw error;
    if (inserted) qc.invalidateQueries({ queryKey: ['checkin', userId] });
  } finally {
    running = false;
  }
}

/**
 * Signed in: keeps users.timezone in step with the phone (the scheduled check-in uses it) and
 * runs the check-in fallback at launch and whenever the app comes back to the foreground.
 */
export function NutritionProvider() {
  const { userId, profile } = useAuth();
  const qc = useQueryClient();
  const weekday = profile?.checkin_weekday ?? 1;
  const zone = profile?.timezone;

  useEffect(() => {
    if (!userId) return;
    let tz: string | undefined;
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      tz = undefined;
    }
    if (tz && zone && tz !== zone)
      void supabase
        .from('users')
        .update({ timezone: tz })
        .eq('id', userId)
        .then(({ error }) => {
          if (!error) qc.invalidateQueries({ queryKey: profileKey(userId) });
        });
  }, [userId, zone, qc]);

  useEffect(() => {
    if (!userId) return;
    const run = () => void runCheckinIfDue(userId, weekday, qc).catch(() => {});
    run();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && run());
    return () => sub.remove();
  }, [userId, weekday, qc]);

  return null;
}
