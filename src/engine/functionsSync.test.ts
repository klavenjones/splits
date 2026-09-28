/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { outputs, dir } = require('../../scripts/sync-functions.js');

describe('supabase/functions/_shared', () => {
  it('matches the engine sources (run `npm run functions:sync`)', () => {
    for (const [name, code] of Object.entries(outputs() as Record<string, string>))
      expect(fs.readFileSync(path.join(dir, name), 'utf8')).toBe(code);
  });
});
