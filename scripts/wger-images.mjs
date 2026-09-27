// Builds supabase/seed-data/wger-images.json from the hand-checked map in wger-map.json.
//   node scripts/wger-images.mjs                 # refresh the JSON from the wger API
//   node scripts/wger-images.mjs --download DIR  # also download the image files into DIR
// Rules: line art only (style 1) by Everkinetic or wger.de, whose provenance is known; no
// AI-generated images; licenses CC-BY-SA 3/4, CC0, CC-BY 4 only; prefer the main image.
// wger's photo uploads (style 4) are user-submitted and several look copied from other sites, so
// they are excluded. Files are stored unmodified, so they are attributed, not adapted.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mapPath = join(root, 'supabase/seed-data/wger-map.json');
const outPath = join(root, 'supabase/seed-data/wger-images.json');
const API = 'https://wger.de/api/v2';
const ALLOWED_LICENSES = new Set([1, 2, 3, 4]);
const ALLOWED_AUTHORS = new Set(['Everkinetic', 'wger.de']);
const EXT = { png: 'png', jpg: 'jpg', jpeg: 'jpg', webp: 'webp' };

const get = async (path) => {
  const res = await fetch(`${API}${path}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
};

const slug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const map = JSON.parse(readFileSync(mapPath, 'utf8'));
const [images, licenses, info] = await Promise.all([
  get('/exerciseimage/?limit=1000&format=json'),
  get('/license/?format=json'),
  get('/exerciseinfo/?limit=1000&format=json'),
]);
const licenseById = new Map(licenses.results.map((l) => [l.id, l]));
// wger's exercise page needs the English name as a slug: /en/exercise/73/view/bench-press
const englishName = new Map(
  info.results.map((e) => [e.id, e.translations.find((t) => t.language === 2)?.name ?? '']),
);

const entries = [];
const missing = [];
for (const [name, exerciseId] of Object.entries(map)) {
  const usable = images.results
    .filter(
      (i) =>
        i.exercise === exerciseId &&
        i.style === '1' &&
        ALLOWED_AUTHORS.has(i.license_author.trim()) &&
        !i.is_ai_generated &&
        ALLOWED_LICENSES.has(i.license) &&
        EXT[i.image.split('.').pop().toLowerCase()],
    )
    .sort((a, b) => Number(b.is_main) - Number(a.is_main) || a.id - b.id);
  const img = usable[0];
  if (!img) {
    missing.push(name);
    continue;
  }
  const license = licenseById.get(img.license);
  const ext = EXT[img.image.split('.').pop().toLowerCase()];
  entries.push({
    name,
    wger_exercise_id: exerciseId,
    wger_image_id: img.id,
    image_url: img.image,
    file: `builtin/${slug(name)}.${ext}`,
    credit: {
      author: img.license_author.trim(),
      ...(img.license_author_url ? { author_url: img.license_author_url } : {}),
      license: license.short_name,
      license_url: license.url,
      source_url: `https://wger.de/en/exercise/${exerciseId}/view/${slug(englishName.get(exerciseId) || name)}`,
    },
  });
}

entries.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
writeFileSync(outPath, JSON.stringify(entries, null, 2) + '\n');
console.log(`Wrote ${entries.length} images to ${outPath.replace(root + '/', '')}`);
if (missing.length) console.log(`No usable image for: ${missing.join(', ')}`);

const i = process.argv.indexOf('--download');
if (i > -1) {
  const dir = process.argv[i + 1];
  for (const e of entries) {
    const res = await fetch(e.image_url);
    if (!res.ok) throw new Error(`${e.image_url}: HTTP ${res.status}`);
    const path = join(dir, e.file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  }
  console.log(`Downloaded ${entries.length} files to ${dir}`);
}
