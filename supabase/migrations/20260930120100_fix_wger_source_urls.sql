-- Step 2b fix: wger exercise pages need the name slug (/en/exercise/73/view/bench-press); the first
-- migration stored /view/ without it, which opens a "Page not found". Credits from
-- supabase/seed-data/wger-images.json (20260930120000 is regenerated with the same values for fresh
-- databases, so this is a no-op there).
update public.exercises e
set media_credit = v.credit
from (values
  ('back extension', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/301/view/hyperextensions"}'::jsonb),
  ('barbell curl', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/91/view/biceps-curls-with-barbell"}'::jsonb),
  ('barbell row', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/83/view/bent-over-rowing"}'::jsonb),
  ('barbell shrug', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/571/view/shrugs-barbells"}'::jsonb),
  ('bench dip', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/197/view/dips-between-two-benches"}'::jsonb),
  ('bench press', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/73/view/bench-press"}'::jsonb),
  ('cable curl', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/95/view/biceps-curl-with-cable"}'::jsonb),
  ('chin-up', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/152/view/chin-up"}'::jsonb),
  ('close-grip bench press', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/76/view/bench-press-narrow-grip"}'::jsonb),
  ('crunch', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/167/view/crunches"}'::jsonb),
  ('decline bench press', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/185/view/decline-bench-press-barbell"}'::jsonb),
  ('dumbbell bench press', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/75/view/benchpress-dumbbells"}'::jsonb),
  ('dumbbell curl', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/92/view/biceps-curls-with-dumbbell"}'::jsonb),
  ('dumbbell shoulder press', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/567/view/shoulder-press-dumbbells"}'::jsonb),
  ('dumbbell shrug', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/572/view/shrugs-dumbbells"}'::jsonb),
  ('front squat', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/257/view/front-squats"}'::jsonb),
  ('good morning', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/1392/view/good-morning"}'::jsonb),
  ('hammer curl', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/272/view/hammer-curls"}'::jsonb),
  ('incline bench press', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/538/view/incline-bench-press-barbell"}'::jsonb),
  ('incline dumbbell press', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/537/view/incline-bench-press-dumbbell"}'::jsonb),
  ('lateral raise', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/348/view/lateral-raises"}'::jsonb),
  ('lying leg curl', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/365/view/leg-curls-laying"}'::jsonb),
  ('machine shoulder press', '{"author":"wger.de","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/543/view/shoulder-press-on-machine"}'::jsonb),
  ('pec deck', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/135/view/butterfly"}'::jsonb),
  ('preacher curl', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/465/view/preacher-curls"}'::jsonb),
  ('rack pull', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/484/view/rack-deadlift"}'::jsonb),
  ('rope hammer curl', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/275/view/hammercurls-on-cable"}'::jsonb),
  ('seated cable row', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/394/view/long-pulley-low-row"}'::jsonb),
  ('seated leg curl', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/366/view/leg-curls-sitting"}'::jsonb),
  ('skull crusher', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/246/view/skullcrusher-sz-bar"}'::jsonb),
  ('smith machine incline press', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/539/view/incline-bench-press-mp"}'::jsonb),
  ('T-bar row', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/513/view/rowing-t-bar"}'::jsonb),
  ('walking lunge', '{"author":"Everkinetic","license":"CC-BY-SA 3","license_url":"https://creativecommons.org/licenses/by-sa/3.0/deed.en","source_url":"https://wger.de/en/exercise/206/view/dumbbell-lunges-walking"}'::jsonb)
) as v (name, credit)
where e.owner_id is null and e.name = v.name;
