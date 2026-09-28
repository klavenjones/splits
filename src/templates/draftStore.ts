/**
 * The template being edited, shared by the builder screen and its sheets (edit segment, edit
 * exercise targets). One draft at a time; the builder starts it and clears it on close.
 */
import { useSyncExternalStore } from 'react';

import type { LiftBlock } from './liftTemplate';
import type { Block } from './runSegments';

export type TemplateDraft = {
  id: string | null;
  name: string;
  notes: string;
  kind: 'lift' | 'run';
  lift: LiftBlock[];
  run: Block[];
};

let draft: TemplateDraft | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function startDraft(d: TemplateDraft) {
  draft = d;
  emit();
}

export function updateDraft(fn: (d: TemplateDraft) => TemplateDraft) {
  if (!draft) return;
  draft = fn(draft);
  emit();
}

export function clearDraft() {
  draft = null;
  emit();
}

export const getDraft = () => draft;

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useDraft(): TemplateDraft | null {
  return useSyncExternalStore(subscribe, getDraft, getDraft);
}
