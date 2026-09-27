import images from '../../supabase/seed-data/wger-images.json';
import map from '../../supabase/seed-data/wger-map.json';
import seed from '../../supabase/seed-data/exercises.json';
import { readCredit } from './describe';

const names = new Set((seed as { name: string }[]).map((e) => e.name));

describe('wger illustrations for built-ins', () => {
  it('covers exactly the hand-checked map', () => {
    expect(images.map((i) => i.name).sort()).toEqual(Object.keys(map).sort());
  });

  it('points at existing built-ins, once each, under builtin/', () => {
    for (const i of images) {
      expect([i.name, names.has(i.name)]).toEqual([i.name, true]);
      expect(i.file).toMatch(/^builtin\/[a-z0-9-]+\.(png|jpg|webp)$/);
      expect(i.image_url).toMatch(/^https:\/\/wger\.de\/media\//);
    }
    expect(new Set(images.map((i) => i.file)).size).toBe(images.length);
  });

  it('carries a complete Creative Commons credit', () => {
    for (const i of images) {
      const c = readCredit(i.credit);
      expect([i.name, c !== null]).toEqual([i.name, true]);
      expect(c!.license).toMatch(/^(CC-BY-SA 3|CC-BY-SA 4|CC-BY 4|CC0)$/);
      expect(['Everkinetic', 'wger.de']).toContain(c!.author);
      // wger's exercise page 404s without the name slug.
      expect(c!.sourceUrl).toMatch(/^https:\/\/wger\.de\/en\/exercise\/\d+\/view\/[a-z0-9-]+$/);
    }
  });
});
