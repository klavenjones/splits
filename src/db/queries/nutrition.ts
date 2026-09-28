/**
 * Food diary, foods, saved meals, weigh-ins and the weekly check-in. Logging goes through RPCs
 * that snapshot nutrition from `foods` on the server (docs/data-model.md → food_logs).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../client';
import type { Tables } from '../types';

import { addDays, mondayOf } from '@/engine/calendar';
import type { DayRecord, NutritionProfile } from '@/engine/checkin';
import type { FoodCandidate } from '@/food/normalize';

import { targetsKey } from './targets';

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export const MEALS: readonly Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'];
export const MEAL_LABEL: Record<Meal, string> = {
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
  snack: 'snacks',
};

/** The meal for "log food" by time of day. */
export function mealForHour(h: number): Meal {
  return h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 21 ? 'dinner' : 'snack';
}

export type Food = Tables<'foods'>;
export type FoodLog = Tables<'food_logs'> & {
  foods: Pick<Tables<'foods'>, 'serving_qty' | 'serving_unit'> | null;
};
export type Targets = Tables<'weekly_targets'>;

const STALE = 60_000;

/* ---------------- diary ---------------- */

export const diaryKey = (userId: string | undefined, date: string) =>
  ['diary', userId, date] as const;

export function useDiary(userId: string | undefined, date: string) {
  return useQuery({
    queryKey: diaryKey(userId, date),
    enabled: !!userId,
    staleTime: STALE,
    queryFn: async (): Promise<FoodLog[]> => {
      const { data, error } = await supabase
        .from('food_logs')
        .select('*, foods(serving_qty, serving_unit)')
        .eq('log_date', date)
        .order('created_at');
      if (error) throw error;
      return data as unknown as FoodLog[];
    },
  });
}

/** Days with any food logged from `from` through `to`. */
export function useDaysLogged(userId: string | undefined, from: string, to: string) {
  return useQuery({
    queryKey: ['diary', userId, 'logged', from, to],
    enabled: !!userId,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('daily_intake', { p_from: from, p_to: to });
      if (error) throw error;
      return data.length;
    },
  });
}

/** Targets in force on `date`: the latest accepted or kept row from that week or before. */
export function useTargetsOn(userId: string | undefined, date: string) {
  const week = mondayOf(date);
  return useQuery({
    queryKey: [...targetsKey(userId), week],
    enabled: !!userId,
    staleTime: STALE,
    queryFn: async (): Promise<Targets | null> => {
      const { data, error } = await supabase
        .from('weekly_targets')
        .select('*')
        .lte('week_start', week)
        .in('status', ['accepted', 'kept'])
        .order('week_start', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function totals(logs: readonly FoodLog[]) {
  return logs.reduce(
    (t, l) => ({
      kcal: t.kcal + Number(l.kcal),
      protein: t.protein + Number(l.protein_g),
      fat: t.fat + Number(l.fat_g),
      carbs: t.carbs + Number(l.carbs_g),
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  );
}

function useInvalidateNutrition(userId: string | undefined) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['diary', userId] });
    qc.invalidateQueries({ queryKey: ['foods', userId] });
    qc.invalidateQueries({ queryKey: ['checkin', userId] });
  };
}

export type LogItem =
  | { food_id: string; servings: number }
  | { name?: string; kcal: number; protein_g?: number; fat_g?: number; carbs_g?: number };

/** Logs foods (and quick adds) to one meal in one call. */
export function useLogFoods(userId: string | undefined) {
  const invalidate = useInvalidateNutrition(userId);
  return useMutation({
    mutationFn: async (v: { date: string; meal: Meal; items: LogItem[]; savedMealId?: string }) => {
      const { error } = await supabase.rpc('log_foods', {
        p: { log_date: v.date, meal: v.meal, items: v.items, saved_meal_id: v.savedMealId ?? null },
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useLogSavedMeal(userId: string | undefined) {
  const invalidate = useInvalidateNutrition(userId);
  return useMutation({
    mutationFn: async (v: { id: string; date: string; meal: Meal }) => {
      const { error } = await supabase.rpc('log_saved_meal', {
        p_saved_meal_id: v.id,
        p_log_date: v.date,
        p_meal: v.meal,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteLog(userId: string | undefined) {
  const invalidate = useInvalidateNutrition(userId);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('food_logs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** New servings for a logged food: the snapshot scales, it isn't re-read from the food. */
export function useUpdateLogServings(userId: string | undefined) {
  const invalidate = useInvalidateNutrition(userId);
  return useMutation({
    mutationFn: async ({ log, servings }: { log: FoodLog; servings: number }) => {
      const f = servings / Number(log.servings);
      const r = (n: number) => Math.round(Number(n) * f * 10) / 10;
      const { error } = await supabase
        .from('food_logs')
        .update({
          servings,
          kcal: r(log.kcal),
          protein_g: r(log.protein_g),
          fat_g: r(log.fat_g),
          carbs_g: r(log.carbs_g),
        })
        .eq('id', log.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/* ---------------- foods ---------------- */

/** Most-logged foods over the last 60 days, most logged first. */
export function useRecentFoods(userId: string | undefined, today: string) {
  return useQuery({
    queryKey: ['foods', userId, 'recent'],
    enabled: !!userId,
    staleTime: STALE,
    queryFn: async (): Promise<Food[]> => {
      const { data, error } = await supabase
        .from('food_logs')
        .select('food_id, foods(*)')
        .gte('log_date', addDays(today, -60))
        .not('food_id', 'is', null)
        .limit(1000);
      if (error) throw error;
      const counts = new Map<string, { food: Food; n: number }>();
      for (const row of data as unknown as { food_id: string; foods: Food | null }[]) {
        if (!row.foods) continue;
        const c = counts.get(row.food_id) ?? { food: row.foods, n: 0 };
        c.n++;
        counts.set(row.food_id, c);
      }
      return [...counts.values()]
        .sort((a, b) => b.n - a.n)
        .slice(0, 30)
        .map((c) => c.food);
    },
  });
}

export function useMyFoods(userId: string | undefined) {
  return useQuery({
    queryKey: ['foods', userId, 'mine'],
    enabled: !!userId,
    staleTime: STALE,
    queryFn: async (): Promise<Food[]> => {
      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .eq('owner_id', userId!)
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useFood(id: string | undefined) {
  return useQuery({
    queryKey: ['food', id],
    enabled: !!id,
    staleTime: Infinity,
    queryFn: async (): Promise<Food> => {
      const { data, error } = await supabase.from('foods').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
  });
}

export type NewFood = Pick<
  Food,
  | 'name'
  | 'brand'
  | 'serving_qty'
  | 'serving_unit'
  | 'serving_grams'
  | 'kcal'
  | 'protein_g'
  | 'fat_g'
  | 'carbs_g'
>;

export function useCreateFood(userId: string | undefined) {
  const invalidate = useInvalidateNutrition(userId);
  return useMutation({
    mutationFn: async (f: NewFood): Promise<Food> => {
      const { data, error } = await supabase
        .from('foods')
        .insert({ ...f, owner_id: userId!, source: 'custom' })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

/** Search: USDA through the `food` Edge Function, plus your own foods matching by name. */
export async function searchFoods(q: string, userId: string): Promise<(Food | FoodCandidate)[]> {
  const [remote, mine] = await Promise.all([
    supabase.functions.invoke<{ foods: FoodCandidate[] }>(`food?q=${encodeURIComponent(q)}`, {
      method: 'GET',
    }),
    supabase.from('foods').select('*').eq('owner_id', userId).ilike('name', `%${q}%`).limit(10),
  ]);
  if (remote.error && mine.error) throw remote.error;
  return [...(mine.data ?? []), ...(remote.data?.foods ?? [])];
}

export async function lookupBarcode(code: string): Promise<FoodCandidate | null> {
  const { data, error } = await supabase.functions.invoke<{ food: FoodCandidate | null }>(
    `food?barcode=${encodeURIComponent(code)}`,
    { method: 'GET' },
  );
  if (error) throw error;
  return data?.food ?? null;
}

/** A searched food as a `foods` row: cached by the Edge Function from its source. */
export async function cacheFood(c: FoodCandidate | Food): Promise<Food> {
  if ('id' in c) return c;
  const { data, error } = await supabase.functions.invoke<{ food: Food }>('food', {
    method: 'POST',
    body: { source: c.source, external_id: c.external_id },
  });
  if (error || !data?.food) throw error ?? new Error('Couldn’t save that food.');
  return data.food;
}

/* ---------------- saved meals ---------------- */

export type SavedMeal = Tables<'saved_meals'> & {
  saved_meal_items: (Tables<'saved_meal_items'> & { foods: Food })[];
};

export function useSavedMeals(userId: string | undefined) {
  return useQuery({
    queryKey: ['foods', userId, 'meals'],
    enabled: !!userId,
    staleTime: STALE,
    queryFn: async (): Promise<SavedMeal[]> => {
      const { data, error } = await supabase
        .from('saved_meals')
        .select('*, saved_meal_items(*, foods(*))')
        .order('name');
      if (error) throw error;
      return data as unknown as SavedMeal[];
    },
  });
}

export function useSaveMeal(userId: string | undefined) {
  const invalidate = useInvalidateNutrition(userId);
  return useMutation({
    mutationFn: async (v: {
      id?: string;
      name: string;
      items: { food_id: string; servings: number }[];
    }) => {
      let id = v.id;
      if (id) {
        const u = await supabase.from('saved_meals').update({ name: v.name }).eq('id', id);
        if (u.error) throw u.error;
        const d = await supabase.from('saved_meal_items').delete().eq('saved_meal_id', id);
        if (d.error) throw d.error;
      } else {
        const ins = await supabase
          .from('saved_meals')
          .insert({ user_id: userId!, name: v.name })
          .select('id')
          .single();
        if (ins.error) throw ins.error;
        id = ins.data.id;
      }
      if (v.items.length) {
        const it = await supabase
          .from('saved_meal_items')
          .insert(v.items.map((i) => ({ ...i, saved_meal_id: id! })));
        if (it.error) throw it.error;
      }
      return id!;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteSavedMeal(userId: string | undefined) {
  const invalidate = useInvalidateNutrition(userId);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('saved_meals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/* ---------------- weigh-ins ---------------- */

export type Checkin = Tables<'body_checkins'>;

/** Weigh-ins and measurements from `from` on, oldest first. */
export function useWeighIns(userId: string | undefined, from: string) {
  return useQuery({
    queryKey: ['weighins', userId, from],
    enabled: !!userId,
    staleTime: STALE,
    queryFn: async (): Promise<Checkin[]> => {
      const { data, error } = await supabase
        .from('body_checkins')
        .select('*')
        .gte('checkin_date', from)
        .order('checkin_date');
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveWeighIn(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      date: string;
      weight_kg?: number;
      waist_cm?: number;
      neck_cm?: number;
      hip_cm?: number;
      body_fat_pct?: number;
    }) => {
      const { error } = await supabase.rpc('save_weigh_in', { p });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weighins', userId] });
      qc.invalidateQueries({ queryKey: ['progress', userId] });
      qc.invalidateQueries({ queryKey: ['checkin', userId] });
    },
  });
}

/* ---------------- nutrition profile and check-in ---------------- */

export function useNutritionProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['nutrition-profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nutrition_profiles')
        .select('*')
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Weigh-ins, measurements and daily intake since the start, as the engine's day records. */
export async function fetchDays(startDate: string, before: string): Promise<DayRecord[]> {
  const [checkins, intake] = await Promise.all([
    supabase
      .from('body_checkins')
      .select('checkin_date, weight_kg, body_fat_pct')
      .gte('checkin_date', startDate)
      .lt('checkin_date', before),
    supabase.rpc('daily_intake', { p_from: startDate, p_to: addDays(before, -1) }),
  ]);
  if (checkins.error) throw checkins.error;
  if (intake.error) throw intake.error;
  const days = new Map<string, DayRecord>();
  const day = (date: string) => {
    let d = days.get(date);
    if (!d) days.set(date, (d = { date, weightKg: null, kcal: null, bodyFatPct: null }));
    return d;
  };
  for (const c of checkins.data) {
    const d = day(c.checkin_date);
    d.weightKg = c.weight_kg === null ? null : Number(c.weight_kg);
    d.bodyFatPct = c.body_fat_pct === null ? null : Number(c.body_fat_pct);
  }
  for (const i of intake.data) day(i.log_date).kcal = Number(i.kcal);
  return [...days.values()];
}

export const asEngineProfile = (p: Tables<'nutrition_profiles'>): NutritionProfile => ({
  sex: p.sex,
  experience: p.experience,
  goal: p.goal,
  phase: p.phase,
  rate_mode: p.rate_mode,
  weekly_rate_pct: Number(p.weekly_rate_pct),
  start_date: p.start_date,
  start_weight_kg: Number(p.start_weight_kg),
  start_body_fat_pct: Number(p.start_body_fat_pct),
});

/** A week's targets row and the one before it (for "keep" and "last week"). */
export function useCheckin(userId: string | undefined, week: string) {
  return useQuery({
    queryKey: ['checkin', userId, week],
    enabled: !!userId,
    queryFn: async () => {
      const [row, prev] = await Promise.all([
        supabase.from('weekly_targets').select('*').eq('week_start', week).maybeSingle(),
        supabase
          .from('weekly_targets')
          .select('*')
          .lt('week_start', week)
          .in('status', ['accepted', 'kept'])
          .order('week_start', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (row.error) throw row.error;
      if (prev.error) throw prev.error;
      return { row: row.data, prev: prev.data };
    },
  });
}

/** The latest proposal waiting for a decision (Today's and the diary's prompt). */
export function usePendingCheckin(userId: string | undefined) {
  return useQuery({
    queryKey: ['checkin', userId, 'pending'],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_targets')
        .select('week_start')
        .eq('status', 'proposed')
        .order('week_start', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.week_start ?? null;
    },
  });
}

export function useDecideCheckin(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { week: string; accept: boolean }) => {
      const { error } = await supabase.rpc('decide_weekly_targets', {
        p_week_start: v.week,
        p_accept: v.accept,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checkin', userId] });
      qc.invalidateQueries({ queryKey: targetsKey(userId) });
    },
  });
}

/** Target history: every weekly row, newest first. */
export function useTargetHistory(userId: string | undefined) {
  return useQuery({
    queryKey: [...targetsKey(userId), 'history'],
    enabled: !!userId,
    queryFn: async (): Promise<Targets[]> => {
      const { data, error } = await supabase
        .from('weekly_targets')
        .select('*')
        .order('week_start', { ascending: false })
        .limit(52);
      if (error) throw error;
      return data;
    },
  });
}
