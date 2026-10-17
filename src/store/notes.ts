/**
 * Exercise notes for the signed-in user, read from SQLite. An edit is written there first, then
 * shown here, then sent by the sync service (src/local/syncService.ts).
 */
import { create } from 'zustand';

import { localDb } from '@/local/db';
import { loadNotes, saveNote } from '@/local/notesRepo';
import { requestSync } from '@/local/syncService';

type State = {
  userId: string | null;
  notes: ReadonlyMap<string, string>;
  load(userId: string): void;
  reload(): void;
  /** Saves `text` as the exercise's note; empty clears it. */
  setNote(exerciseId: string, text: string): void;
};

export const useNotes = create<State>((set, get) => ({
  userId: null,
  notes: new Map(),
  load(userId) {
    set({ userId, notes: loadNotes(localDb(), userId) });
  },
  reload() {
    const { userId } = get();
    if (userId) set({ notes: loadNotes(localDb(), userId) });
  },
  setNote(exerciseId, text) {
    const { userId } = get();
    if (!userId) return;
    saveNote(localDb(), userId, exerciseId, text);
    get().reload();
    requestSync();
  },
}));

/** The note for one exercise, or '' when there is none. */
export const useExerciseNote = (exerciseId: string | undefined) =>
  useNotes((s) => (exerciseId ? (s.notes.get(exerciseId) ?? '') : ''));
