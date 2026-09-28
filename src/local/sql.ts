/**
 * The small synchronous SQL surface the local store uses. The app backs it with expo-sqlite
 * (src/local/db.ts); tests back it with node:sqlite, so the same SQL runs in both.
 */
export type SqlParam = string | number | null;

export interface SqlDb {
  exec(sql: string): void;
  run(sql: string, params?: readonly SqlParam[]): void;
  all<T>(sql: string, params?: readonly SqlParam[]): T[];
  /** Runs `fn` in a transaction; rolls back if it throws. */
  transaction(fn: () => void): void;
}

/** Schema migrations, applied in order and tracked with PRAGMA user_version. */
const MIGRATIONS: string[] = [
  `
  create table l_sessions (
    id text primary key,
    user_id text not null,
    template_id text,
    origin text not null,
    kind text not null,
    name text not null,
    scheduled_date text not null,
    status text not null,
    started_at text not null,
    ended_at text,
    feel text,
    notes text,
    rest_ends_at integer,
    rest_total_s integer,
    update_template text,
    discarded integer not null default 0,
    rev integer not null default 0,
    synced_rev integer not null default 0,
    synced_at text
  );
  create table l_session_exercises (
    id text primary key,
    session_id text not null references l_sessions (id) on delete cascade,
    position integer not null,
    exercise_id text not null,
    superset_group integer,
    rest_sec integer,
    notes text,
    swapped_from_exercise_id text,
    name text not null,
    primary_muscle text,
    equipment text,
    rep_min integer,
    rep_max integer,
    from_template integer not null
  );
  create index l_session_exercises_session on l_session_exercises (session_id);
  create table l_set_logs (
    id text primary key,
    session_id text not null references l_sessions (id) on delete cascade,
    session_exercise_id text not null references l_session_exercises (id) on delete cascade,
    set_number integer not null,
    set_type text not null,
    weight_kg real,
    reps integer,
    rpe real,
    completed_at text
  );
  create index l_set_logs_session on l_set_logs (session_id);
  create table l_previous (
    exercise_id text not null,
    idx integer not null,
    set_type text not null,
    weight_kg real,
    reps integer,
    performed_on text not null,
    primary key (exercise_id, idx)
  );
  create table l_bests (
    exercise_id text primary key,
    e1rm_kg real not null,
    weight_kg real not null,
    reps integer not null
  );
  `,
];

export function migrate(db: SqlDb) {
  db.exec('pragma foreign_keys = on');
  const [{ user_version }] = db.all<{ user_version: number }>('pragma user_version');
  for (let v = user_version; v < MIGRATIONS.length; v++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[v]);
      db.exec(`pragma user_version = ${v + 1}`);
    });
  }
}
