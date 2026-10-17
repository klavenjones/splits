/**
 * Exercise notes on this phone. Edits land here first (marked dirty) and are sent by the sync
 * service; a server refresh never overwrites a note that hasn't been sent yet. An empty note is
 * kept as a tombstone (note = '') until it is sent, then removed.
 */
import { NOTES_MAX } from '@/exercises/validate';

import type { SqlDb } from './sql';

export type NoteRow = { exercise_id: string; note: string; updated_at: string };

/** The note's text, trimmed and capped; '' means "no note". */
export const cleanNote = (text: string) => text.trim().slice(0, NOTES_MAX);

export function saveNote(
  db: SqlDb,
  userId: string,
  exerciseId: string,
  text: string,
  now = new Date().toISOString(),
) {
  db.run(
    `insert into l_exercise_notes (user_id, exercise_id, note, updated_at, dirty)
     values (?, ?, ?, ?, 1)
     on conflict (user_id, exercise_id) do update
       set note = excluded.note, updated_at = excluded.updated_at, dirty = 1`,
    [userId, exerciseId, cleanNote(text), now],
  );
}

/** The user's notes by exercise id; cleared notes waiting to be sent are left out. */
export function loadNotes(db: SqlDb, userId: string): Map<string, string> {
  return new Map(
    db
      .all<NoteRow>(
        "select exercise_id, note, updated_at from l_exercise_notes where user_id = ? and note <> ''",
        [userId],
      )
      .map((r) => [r.exercise_id, r.note]),
  );
}

export function loadDirtyNotes(db: SqlDb, userId: string): NoteRow[] {
  return db.all<NoteRow>(
    'select exercise_id, note, updated_at from l_exercise_notes where user_id = ? and dirty = 1',
    [userId],
  );
}

/** Marks a sent note clean, unless it was edited again meanwhile; a sent clear is removed. */
export function markNoteSent(db: SqlDb, userId: string, sent: NoteRow) {
  db.transaction(() => {
    db.run(
      `update l_exercise_notes set dirty = 0
       where user_id = ? and exercise_id = ? and updated_at = ?`,
      [userId, sent.exercise_id, sent.updated_at],
    );
    db.run(
      `delete from l_exercise_notes
       where user_id = ? and exercise_id = ? and dirty = 0 and note = ''`,
      [userId, sent.exercise_id],
    );
  });
}

/** Replaces the clean notes with the server's; notes with unsent edits are kept as they are. */
export function replaceNotes(db: SqlDb, userId: string, rows: readonly NoteRow[]) {
  db.transaction(() => {
    db.run('delete from l_exercise_notes where user_id = ? and dirty = 0', [userId]);
    for (const r of rows)
      db.run(
        `insert or ignore into l_exercise_notes (user_id, exercise_id, note, updated_at, dirty)
         values (?, ?, ?, ?, 0)`,
        [userId, r.exercise_id, r.note, r.updated_at],
      );
  });
}
