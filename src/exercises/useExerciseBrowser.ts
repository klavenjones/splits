import { useDeferredValue, useMemo, useState } from 'react';

import { useExercises, type ExerciseListItem } from '@/db/queries/exercises';

import { filterExercises } from './filter';
import { toSections } from './sections';
import type { Equipment, MovementPattern, MuscleGroup } from './vocab';

const toggle = <T>(list: readonly T[], v: T): T[] =>
  list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

/** Search + filter state shared by the library screen and the picker sheet. */
export function useExerciseBrowser(userId: string | undefined) {
  const query = useExercises(userId);
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState<MuscleGroup[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [patterns, setPatterns] = useState<MovementPattern[]>([]);
  // Typing stays responsive while the list re-filters.
  const deferredSearch = useDeferredValue(search);

  const all = query.data;
  const filtered = useMemo(
    () => filterExercises(all ?? [], { query: deferredSearch, groups, equipment, patterns }),
    [all, deferredSearch, groups, equipment, patterns],
  );
  const { sections, letters } = useMemo(
    () => toSections<ExerciseListItem>(filtered, userId ?? null),
    [filtered, userId],
  );

  return {
    query,
    all: all ?? [],
    search,
    setSearch,
    groups,
    toggleGroup: (g: MuscleGroup) => setGroups((l) => toggle(l, g)),
    clearGroups: () => setGroups([]),
    equipment,
    toggleEquipment: (e: Equipment) => setEquipment((l) => toggle(l, e)),
    clearEquipment: () => setEquipment([]),
    patterns,
    togglePattern: (p: MovementPattern) => setPatterns((l) => toggle(l, p)),
    clearPatterns: () => setPatterns([]),
    filtering:
      search.trim() !== '' || groups.length > 0 || equipment.length > 0 || patterns.length > 0,
    filtered,
    sections,
    letters,
  };
}
