import { memoryDb } from './testDb';
import {
  cleanNote,
  loadDirtyNotes,
  loadNotes,
  markNoteSent,
  replaceNotes,
  saveNote,
} from './notesRepo';
import { migrate } from './sql';

const U = 'user-1';
const BENCH = 'ex-bench';
const SQUAT = 'ex-squat';

const db = () => {
  const d = memoryDb();
  migrate(d);
  return d;
};

describe('exercise notes (local)', () => {
  it('trims and caps a note', () => {
    expect(cleanNote('  seat 4  ')).toBe('seat 4');
    expect(cleanNote('x'.repeat(600))).toHaveLength(500);
  });

  it('saves a note and marks it unsent', () => {
    const d = db();
    saveNote(d, U, BENCH, ' seat height 4 ', '2026-10-16T10:00:00.000Z');
    expect(loadNotes(d, U).get(BENCH)).toBe('seat height 4');
    expect(loadDirtyNotes(d, U)).toEqual([
      { exercise_id: BENCH, note: 'seat height 4', updated_at: '2026-10-16T10:00:00.000Z' },
    ]);
  });

  it('keeps notes separate per user', () => {
    const d = db();
    saveNote(d, U, BENCH, 'mine');
    expect(loadNotes(d, 'user-2').size).toBe(0);
  });

  it('hides a cleared note, keeps it to send, then removes it once sent', () => {
    const d = db();
    saveNote(d, U, BENCH, 'seat 4', '2026-10-16T10:00:00.000Z');
    markNoteSent(d, U, loadDirtyNotes(d, U)[0]);
    saveNote(d, U, BENCH, '   ', '2026-10-16T11:00:00.000Z');
    expect(loadNotes(d, U).has(BENCH)).toBe(false);
    const [clear] = loadDirtyNotes(d, U);
    expect(clear.note).toBe('');
    markNoteSent(d, U, clear);
    expect(loadDirtyNotes(d, U)).toEqual([]);
    expect(d.all('select * from l_exercise_notes')).toEqual([]);
  });

  it('keeps an edit made while the previous one was being sent', () => {
    const d = db();
    saveNote(d, U, BENCH, 'first', '2026-10-16T10:00:00.000Z');
    const [sent] = loadDirtyNotes(d, U);
    saveNote(d, U, BENCH, 'second', '2026-10-16T10:00:05.000Z');
    markNoteSent(d, U, sent);
    expect(loadDirtyNotes(d, U).map((n) => n.note)).toEqual(['second']);
  });

  it('a server refresh replaces clean notes but never an unsent edit', () => {
    const d = db();
    saveNote(d, U, BENCH, 'local edit', '2026-10-16T10:00:00.000Z');
    saveNote(d, U, SQUAT, 'old', '2026-10-15T10:00:00.000Z');
    markNoteSent(
      d,
      U,
      loadDirtyNotes(d, U).find((n) => n.exercise_id === SQUAT)!,
    );
    replaceNotes(d, U, [
      { exercise_id: BENCH, note: 'server bench', updated_at: '2026-10-16T09:00:00.000Z' },
      { exercise_id: SQUAT, note: 'server squat', updated_at: '2026-10-16T09:00:00.000Z' },
      { exercise_id: 'ex-row', note: 'server row', updated_at: '2026-10-16T09:00:00.000Z' },
    ]);
    const notes = loadNotes(d, U);
    expect(notes.get(BENCH)).toBe('local edit');
    expect(notes.get(SQUAT)).toBe('server squat');
    expect(notes.get('ex-row')).toBe('server row');
  });

  it('drops a clean note the server no longer has', () => {
    const d = db();
    replaceNotes(d, U, [{ exercise_id: BENCH, note: 'x', updated_at: '2026-10-16T09:00:00.000Z' }]);
    replaceNotes(d, U, []);
    expect(loadNotes(d, U).size).toBe(0);
  });
});
