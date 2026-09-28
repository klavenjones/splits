// Food search behind one interface (Deno Edge Function; verify_jwt on, so only signed-in users).
//   GET  ?q=chicken        USDA FoodData Central search, normalized per serving
//   GET  ?barcode=0123…    Open Food Facts product, then USDA Branded by GTIN
//   POST {source, external_id}  re-fetch from the source and cache in `foods` (owner null)
// The USDA key stays here (USDA_API_KEY secret); the app never sees it. Only this function writes
// the shared cache, with values fetched from the source, so the cache can't be poisoned.
import { createClient } from 'npm:@supabase/supabase-js@2';

import {
  barcodeVariants,
  normalizeOff,
  normalizeUsda,
  type FoodCandidate,
  type OffProduct,
  type UsdaFood,
} from '../_shared/normalize.ts';

const USDA = 'https://api.nal.usda.gov/fdc/v1';
const OFF = 'https://world.openfoodfacts.org/api/v2/product';
const UA = 'Splits/1.0 (github.com/klavenjones/splits)';
const OFF_FIELDS =
  'code,product_name,product_name_en,brands,serving_size,serving_quantity,nutriments';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function usdaKey(): string {
  const key = Deno.env.get('USDA_API_KEY');
  if (!key) throw new Error('USDA_API_KEY is not set');
  return key;
}

async function usdaSearch(query: string, dataType: string[], pageSize = 25): Promise<UsdaFood[]> {
  // POST: a GET query string can't carry data types with spaces ("SR Legacy") reliably.
  const u = new URL(`${USDA}/foods/search`);
  u.searchParams.set('api_key', usdaKey());
  const r = await fetch(u, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, dataType, pageSize }),
  });
  if (!r.ok) throw new Error(`USDA search ${r.status}`);
  return ((await r.json()) as { foods?: UsdaFood[] }).foods ?? [];
}

async function usdaFood(fdcId: string): Promise<FoodCandidate | null> {
  const u = new URL(`${USDA}/food/${encodeURIComponent(fdcId)}`);
  u.searchParams.set('api_key', usdaKey());
  const r = await fetch(u);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`USDA food ${r.status}`);
  return normalizeUsda((await r.json()) as UsdaFood);
}

async function offProduct(code: string): Promise<FoodCandidate | null> {
  const r = await fetch(`${OFF}/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`, {
    headers: { 'User-Agent': UA },
  });
  if (!r.ok) return null;
  const body = (await r.json()) as { status?: number; product?: OffProduct };
  return body.status === 1 && body.product ? normalizeOff(body.product, code) : null;
}

/** Whole foods first (Foundation, SR Legacy, Survey), then branded, each in USDA's order. */
async function search(q: string): Promise<FoodCandidate[]> {
  const [generic, branded] = await Promise.all([
    usdaSearch(q, ['Foundation', 'SR Legacy', 'Survey (FNDDS)'], 15),
    usdaSearch(q, ['Branded'], 15),
  ]);
  const seen = new Set<string>();
  const out: FoodCandidate[] = [];
  for (const f of [...generic, ...branded]) {
    const c = normalizeUsda(f);
    if (c && !seen.has(c.external_id)) {
      seen.add(c.external_id);
      out.push(c);
    }
  }
  return out.slice(0, 25);
}

async function barcode(code: string): Promise<FoodCandidate | null> {
  const codes = barcodeVariants(code);
  for (const c of codes) {
    const hit = await offProduct(c);
    if (hit) return hit;
  }
  // USDA Branded foods carry the GTIN/UPC.
  for (const c of codes) {
    const foods = (await usdaSearch(c, ['Branded'], 5)) as (UsdaFood & { gtinUpc?: string })[];
    const match = foods.find((f) => f.gtinUpc && codes.includes(f.gtinUpc.replace(/\D/g, '')));
    if (match) return normalizeUsda(match);
  }
  return null;
}

async function cache(source: string, externalId: string) {
  const food =
    source === 'usda'
      ? await usdaFood(externalId)
      : source === 'open_food_facts'
        ? await offProduct(externalId)
        : null;
  if (!food) return null;
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
  const row = { ...food, owner_id: null };
  const existing = await admin
    .from('foods')
    .select('id')
    .eq('source', food.source)
    .eq('external_id', food.external_id)
    .is('owner_id', null)
    .maybeSingle();
  if (existing.error) throw existing.error;
  const write = existing.data
    ? admin.from('foods').update(row).eq('id', existing.data.id).select().single()
    : admin.from('foods').insert(row).select().single();
  const { data, error } = await write;
  if (error) throw error;
  return data;
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    if (req.method === 'GET') {
      const q = url.searchParams.get('q')?.trim();
      const code = url.searchParams.get('barcode')?.trim();
      if (q) return json({ foods: await search(q) });
      if (code) return json({ food: await barcode(code) });
      return json({ error: 'q or barcode required' }, 400);
    }
    if (req.method === 'POST') {
      const body = (await req.json()) as { source?: string; external_id?: string };
      if (!body.source || !body.external_id)
        return json({ error: 'source and external_id required' }, 400);
      const food = await cache(body.source, body.external_id);
      return food ? json({ food }) : json({ error: 'not found' }, 404);
    }
    return json({ error: 'method not allowed' }, 405);
  } catch (e) {
    console.error(e);
    return json({ error: 'food lookup failed' }, 502);
  }
});
