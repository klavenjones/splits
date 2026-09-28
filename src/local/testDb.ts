/** A node:sqlite-backed SqlDb for Jest, so the local store's real SQL runs in tests. */
import type { SqlDb, SqlParam } from './sql';

export function memoryDb(): SqlDb {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require('node:sqlite') as {
    DatabaseSync: new (path: string) => {
      exec(sql: string): void;
      prepare(sql: string): {
        run(...p: SqlParam[]): unknown;
        all(...p: SqlParam[]): unknown[];
      };
    };
  };
  const db = new DatabaseSync(':memory:');
  let depth = 0;
  return {
    exec: (sql) => db.exec(sql),
    run: (sql, params = []) => void db.prepare(sql).run(...params),
    all: <T>(sql: string, params: readonly SqlParam[] = []) =>
      db
        .prepare(sql)
        .all(...params)
        .map((r) => ({ ...(r as object) }) as T),
    transaction(fn) {
      if (depth > 0) return fn();
      depth++;
      db.exec('begin');
      try {
        fn();
        db.exec('commit');
      } catch (e) {
        db.exec('rollback');
        throw e;
      } finally {
        depth--;
      }
    },
  };
}
