import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import { migrate, type SqlDb } from './sql';

let instance: SqlDb | null = null;

function adapter(db: SQLiteDatabase): SqlDb {
  let depth = 0;
  return {
    exec: (sql) => db.execSync(sql),
    run: (sql, params = []) => void db.runSync(sql, [...params]),
    all: <T>(sql: string, params: readonly unknown[] = []) =>
      db.getAllSync<T>(sql, [...(params as (string | number | null)[])]),
    transaction(fn) {
      if (depth > 0) return fn();
      depth++;
      try {
        db.withTransactionSync(fn);
      } finally {
        depth--;
      }
    },
  };
}

/** The on-device database for the active workout and its caches (opened and migrated once). */
export function localDb(): SqlDb {
  if (!instance) {
    instance = adapter(openDatabaseSync('splits-local.db'));
    migrate(instance);
  }
  return instance;
}
