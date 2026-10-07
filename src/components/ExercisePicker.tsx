import { useState } from 'react';
import { Pressable, SectionList, Text, View } from 'react-native';

import { rowSubtitle } from '../exercises/describe';
import { useExerciseBrowser } from '../exercises/useExerciseBrowser';
import { EQUIPMENT, MOVEMENT_PATTERNS, MUSCLE_GROUPS } from '../exercises/vocab';
import { Chip, ChipGroup } from './controls';
import { ActionRow, EmptyState, ExerciseRow, GroupedItem, SearchField } from './exercises';
import { Button, MicroLabel } from './primitives';
import type { ExerciseListItem } from '../db/queries/exercises';

export type ExercisePickerProps = {
  userId: string | undefined;
  title?: string;
  /** Already added; shown checked and locked. */
  excludeIds?: readonly string[];
  /** Pick exactly one: tapping a row confirms. */
  single?: boolean;
  onConfirm: (ids: string[]) => void;
  onCancel: () => void;
  /** "create custom exercise" (with the current search as the name). */
  onCreate?: (name: string) => void;
  /** Shown first while not searching: "suggested for this workout". */
  suggested?: { note: string; ids: readonly string[] };
  /** exercise id → "40 lb × 15" for the rows' "last" line. */
  last?: Readonly<Record<string, string>>;
};

/**
 * Search, filter and multi-select exercises (mockup 03/A2), for the template builder and the
 * logger. The logger passes "suggested for this workout" and last-time lines. ("my gym only" and
 * "add as superset" aren't built yet.)
 */
export function ExercisePicker({
  userId,
  title = 'add exercises',
  excludeIds = [],
  single,
  onConfirm,
  onCancel,
  onCreate,
  suggested,
  last,
}: ExercisePickerProps) {
  const b = useExerciseBrowser(userId);
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState<'muscle' | 'equipment' | 'movement' | null>(null);

  const toggle = (id: string) => {
    if (single) return onConfirm([id]);
    setSelected((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  };

  const muscleLabel =
    b.groups.length === 1 ? b.groups[0] : b.groups.length ? `${b.groups.length} muscles` : 'muscle';
  const movementLabel =
    b.patterns.length === 1
      ? b.patterns[0]
      : b.patterns.length
        ? `${b.patterns.length} movements`
        : 'movement';
  const equipLabel =
    b.equipment.length === 1
      ? b.equipment[0]
      : b.equipment.length
        ? `${b.equipment.length} types`
        : 'equipment';

  const byId = new Map(b.all.map((e) => [e.id, e]));
  const suggestedItems = (suggested?.ids ?? []).flatMap((id) => byId.get(id) ?? []);
  const sections: {
    key: string;
    title: string;
    note?: string;
    data: ExerciseListItem[];
  }[] =
    suggestedItems.length && !b.filtering
      ? [
          {
            key: 'suggested',
            title: 'suggested for this workout',
            note: suggested?.note,
            data: suggestedItems,
          },
          ...b.sections,
        ]
      : b.sections;

  return (
    <View className="flex-1 bg-bg">
      <SectionList
        sections={sections}
        keyExtractor={(e) => e.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        stickySectionHeadersEnabled={false}
        contentContainerClassName="px-5 pb-6"
        ListHeaderComponent={
          <View className="gap-4 pt-6 pb-2">
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              hitSlop={12}
              className="self-start active:opacity-60"
            >
              <Text className="type-label text-text">cancel</Text>
            </Pressable>
            <Text className="type-display text-text" accessibilityRole="header">
              {title}
            </Text>
            <SearchField
              value={b.search}
              onChangeText={b.setSearch}
              placeholder="Search exercises"
            />
            <View className="flex-row flex-wrap gap-2.5">
              <Chip
                role="button"
                leadingIcon={open === 'muscle' ? 'chevron-down' : 'chevron-right'}
                label={muscleLabel}
                selected={b.groups.length > 0}
                onPress={() => setOpen(open === 'muscle' ? null : 'muscle')}
              />
              <Chip
                role="button"
                leadingIcon={open === 'equipment' ? 'chevron-down' : 'chevron-right'}
                label={equipLabel}
                selected={b.equipment.length > 0}
                onPress={() => setOpen(open === 'equipment' ? null : 'equipment')}
              />
              <Chip
                role="button"
                leadingIcon={open === 'movement' ? 'chevron-down' : 'chevron-right'}
                label={movementLabel}
                selected={b.patterns.length > 0}
                onPress={() => setOpen(open === 'movement' ? null : 'movement')}
              />
            </View>
            {open === 'muscle' ? (
              <ChipGroup label="muscle" multi>
                {MUSCLE_GROUPS.map((g) => (
                  <Chip
                    key={g}
                    multi
                    label={g}
                    selected={b.groups.includes(g)}
                    onPress={() => b.toggleGroup(g)}
                  />
                ))}
              </ChipGroup>
            ) : null}
            {open === 'equipment' ? (
              <ChipGroup label="equipment" multi>
                {EQUIPMENT.map((e) => (
                  <Chip
                    key={e}
                    multi
                    label={e}
                    selected={b.equipment.includes(e)}
                    onPress={() => b.toggleEquipment(e)}
                  />
                ))}
              </ChipGroup>
            ) : null}
            {open === 'movement' ? (
              <ChipGroup label="movement" multi>
                {MOVEMENT_PATTERNS.map((p) => (
                  <Chip
                    key={p}
                    multi
                    label={p}
                    selected={b.patterns.includes(p)}
                    onPress={() => b.togglePattern(p)}
                  />
                ))}
              </ChipGroup>
            ) : null}
            {onCreate ? (
              <ActionRow
                label={
                  b.search.trim()
                    ? `create “${b.search.trim()}” as a custom exercise`
                    : 'create custom exercise'
                }
                onPress={() => onCreate(b.search.trim())}
              />
            ) : null}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View className="gap-1 px-1 pt-5 pb-2">
            <MicroLabel>{section.title}</MicroLabel>
            {section.note ? (
              <Text className="type-subhead text-text-muted">{section.note}</Text>
            ) : null}
          </View>
        )}
        renderItem={({ item, index, section }) => {
          const locked = excludeIds.includes(item.id);
          return (
            <GroupedItem index={index} count={section.data.length}>
              <ExerciseRow
                name={item.name}
                primaryMuscle={item.primary_muscle}
                subtitle={rowSubtitle(item)}
                last={last ? (last[item.id] ?? null) : null}
                custom={item.owner_id !== null}
                selectable={!single}
                selected={selected.includes(item.id)}
                locked={locked}
                onPress={() => toggle(item.id)}
                divider={index < section.data.length - 1}
              />
            </GroupedItem>
          );
        }}
        ListEmptyComponent={
          b.query.isPending ? null : (
            <View className="pt-4">
              <EmptyState
                icon="search"
                title={b.query.error ? 'Couldn’t load exercises' : 'No matches'}
                body={
                  b.query.error ? b.query.error.message : 'Try another word, or clear the filters.'
                }
              />
            </View>
          )
        }
      />
      {!single ? (
        <View className="gap-3 border-t border-hairline px-5 pt-3 pb-8">
          <Button
            block
            icon="plus"
            disabled={selected.length === 0}
            onPress={() => onConfirm(selected)}
          >
            {selected.length === 0
              ? 'add exercises'
              : `add ${selected.length} exercise${selected.length === 1 ? '' : 's'}`}
          </Button>
        </View>
      ) : null}
    </View>
  );
}
