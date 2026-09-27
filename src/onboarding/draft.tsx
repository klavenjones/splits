import { createContext, useContext, useState, type ReactNode } from 'react';

import { EMPTY_DRAFT, type OnboardingDraft } from './types';

type DraftState = {
  draft: OnboardingDraft;
  update: (patch: Partial<OnboardingDraft>) => void;
};

const DraftContext = createContext<DraftState | null>(null);

/** Holds onboarding answers across the five steps. Nothing is saved until "your targets". */
export function DraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<OnboardingDraft>(EMPTY_DRAFT);
  const update = (patch: Partial<OnboardingDraft>) => setDraft((d) => ({ ...d, ...patch }));
  return <DraftContext.Provider value={{ draft, update }}>{children}</DraftContext.Provider>;
}

export function useDraft(): DraftState {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error('useDraft must be used inside <DraftProvider>');
  return ctx;
}
