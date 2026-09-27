import { useState } from 'react';
import { Pressable, SectionList, Text, View } from 'react-native';

import { rowSubtitle } from '../exercises/describe';
import { useExerciseBrowser } from '../exercises/useExerciseBrowser';
import { EQUIPMENT, MUSCLE_GROUPS } from '../exercises/vocab';
import { Chip, ChipGroup } from './controls';
import { ActionRow, EmptyState, ExerciseRow, GroupedItem, SearchField } from './exercises';
import { Button, MicroLabel } from './primitives';

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
};

/**
 * Search, filter and multi-select exercises (mockup 03/A2). Used by the picker sheet today, and
 * by the template builder and logger later. "suggested for this workout", "my gym only" and
 * "add as superset" arrive with those steps.
 */
export function ExercisePicker({
  userId,
  title = 'add exercises',
  excludeIds = [],
  single,
  onConfirm,
  onCancel,
  onCreate,
}: ExercisePickerProps) {
  const b = useExerciseBrowser(userId);
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState<'muscle' | 'equipment' | null>(null);

  const toggle = (id: string) => {
    if (single) return onConfirm([id]);
    setSelected((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  };

  const muscleLabel =
    b.groups.length === 1 ? b.groups[0] : b.groups.length ? `${b.groups.length} muscles` : 'muscle';
  const equipLabel =
    b.equipment.length === 1
      ? b.equipment[0]
      : b.equipment.length
        ? `${b.equipment.length} types`
        : 'equipment';

  return (
    <View className="flex-1 bg-bg">
      <SectionList
        sections={b.sections}
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
          <MicroLabel className="px-1 pt-5 pb-2">{section.title}</MicroLabel>
        )}
        renderItem={({ item, index, section }) => {
          const locked = excludeIds.includes(item.id);
          return (
            <GroupedItem index={index} count={section.data.length}>
              <ExerciseRow
                name={item.name}
                primaryMuscle={item.primary_muscle}
                subtitle={rowSubtitle(item)}
                last={null}
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
