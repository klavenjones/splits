/**
 * Copies the pure engine and food normalizer into supabase/functions/_shared for the Edge
 * Functions (Deno needs explicit `.ts` import paths). Run `npm run functions:sync` after editing
 * any source below; src/engine/functionsSync.test.ts fails when the copies are stale.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const FILES = {
  'units.ts': 'src/units.ts',
  'calendar.ts': 'src/engine/calendar.ts',
  'nutrition.ts': 'src/engine/nutrition.ts',
  'checkin.ts': 'src/engine/checkin.ts',
  'normalize.ts': 'src/food/normalize.ts',
};

function outputs() {
  const out = {};
  for (const [target, source] of Object.entries(FILES)) {
    const code = fs
      .readFileSync(path.join(root, source), 'utf8')
      .replace(/from '(\.\.?\/[^']+)'/g, (_, spec) => `from './${path.basename(spec)}.ts'`);
    out[target] = `// GENERATED from ${source} by scripts/sync-functions.js. Do not edit.\n${code}`;
  }
  return out;
}

module.exports = { outputs, dir: path.join(root, 'supabase/functions/_shared') };

if (require.main === module) {
  for (const [name, code] of Object.entries(outputs()))
    fs.writeFileSync(path.join(module.exports.dir, name), code);
  console.log(`synced ${Object.keys(FILES).length} files to supabase/functions/_shared`);
}
