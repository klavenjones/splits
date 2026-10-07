-- Movement slots: which job an exercise does in a session (horizontal press, hinge, ...),
-- independent of the muscle it trains. One slot per exercise; null = untagged (custom exercises
-- until the owner picks one). The allowed values mirror src/exercises/vocab.ts and live in a check
-- constraint, not an enum, so adding a slot is a one-line migration. RLS is per row and already
-- covers the new column; built-ins stay read-only to users.
alter table public.exercises
  add column if not exists movement_pattern text;

alter table public.exercises
  add constraint exercises_movement_pattern_check check (
    movement_pattern is null or movement_pattern in (
    'horizontal press',
    'incline press',
    'vertical press',
    'chest fly',
    'triceps extension',
    'lateral raise',
    'horizontal pull',
    'vertical pull',
    'rear delt / upper back',
    'biceps curl',
    'shrug',
    'squat',
    'hinge',
    'lunge / split squat',
    'hip thrust / bridge',
    'knee extension',
    'knee flexion',
    'calf raise',
    'hip abduction / adduction',
    'anti-extension',
    'flexion',
    'rotation / anti-rotation',
    'back extension',
    'carry',
    'olympic / power',
    'plyometric / jump',
    'conditioning / cardio',
    'mobility / other'
    )
  );

create index if not exists exercises_movement_pattern_idx
  on public.exercises (movement_pattern);
