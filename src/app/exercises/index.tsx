import { router } from 'expo-router';
import { useRef } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import {
  ActionRow,
  AlphabetScrubber,
  Chip,
  ChipGroup,
  EmptyState,
  ExerciseRow,
  MicroLabel,
  SafeAreaView,
  SearchField,
  TopNav,
} from '@/components';
import { rowSubtitle } from '@/exercises/describe';
import { useExerciseBrowser } from '@/exercises/useExerciseBrowser';
import { EQUIPMENT, MOVEMENT_PATTERNS, MUSCLE_GROUPS } from '@/exercises/vocab';
import { space, useTheme } from '@/theme';

/** Exercise library (mockup 09/01): search, muscle and equipment filters, customs first, A–Z. */
export default function ExerciseLibrary() {
  const { c } = useTheme();
  const { userId } = useAuth();
  const b = useExerciseBrowser(userId);
  const scroll = useRef<ScrollView>(null);
  // Section key → y offset inside the scroll content, for the scrubber.
  const offsets = useRef(new Map<string, number>());

  const create = (name = '') =>
    router.push(name ? { pathname: '/exercises/new', params: { name } } : '/exercises/new');

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} className="flex-1">
        <View className="px-4 pt-2 pb-3">
          <TopNav onBack={() => router.back()} title="exercises" />
        </View>
        <View className="flex-1">
          <ScrollView
            ref={scroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerClassName="gap-5 pb-16 pl-4 pr-11"
          >
            <SearchField
              value={b.search}
              onChangeText={b.setSearch}
              placeholder={b.all.length ? `Search ${b.all.length} exercises` : 'Search exercises'}
            />
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="-ml-4"
              contentContainerClassName="gap-2.5 py-1 pr-2 pl-4"
              accessibilityLabel="equipment"
            >
              {EQUIPMENT.map((e) => (
                <Chip
                  key={e}
                  multi
                  label={e}
                  selected={b.equipment.includes(e)}
                  onPress={() => b.toggleEquipment(e)}
                />
              ))}
            </ScrollView>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="-ml-4"
              contentContainerClassName="gap-2.5 py-1 pr-2 pl-4"
              accessibilityLabel="movement"
            >
              {MOVEMENT_PATTERNS.map((p) => (
                <Chip
                  key={p}
                  multi
                  label={p}
                  selected={b.patterns.includes(p)}
                  onPress={() => b.togglePattern(p)}
                />
              ))}
            </ScrollView>

            <ActionRow label="create custom exercise" onPress={() => create()} />

            {b.query.isPending ? (
              <ActivityIndicator color={c.textMuted} />
            ) : b.query.error ? (
              <EmptyState icon="alert" title="Couldn’t load exercises" body={b.query.error.message}>
                <ChipGroup>
                  <Chip role="button" label="try again" onPress={() => b.query.refetch()} />
                </ChipGroup>
              </EmptyState>
            ) : b.sections.length === 0 ? (
              <View className="gap-4">
                <EmptyState
                  icon="search"
                  title="No matches"
                  body="Try another word, or clear the filters."
                />
                {b.search.trim() ? (
                  <ActionRow
                    label={`create “${b.search.trim()}” as a custom exercise`}
                    onPress={() => create(b.search.trim())}
                  />
                ) : null}
              </View>
            ) : (
              b.sections.map((s) => (
                <View
                  key={s.key}
                  className="gap-2"
                  onLayout={(e) => offsets.current.set(s.key, e.nativeEvent.layout.y)}
                >
                  <MicroLabel className="px-4" accessibilityRole="header">
                    {s.title}
                  </MicroLabel>
                  <View className="overflow-hidden rounded-card bg-surface-card shadow-card">
                    {s.data.map((e, i) => (
                      <ExerciseRow
                        key={e.id}
                        name={e.name}
                        primaryMuscle={e.primary_muscle}
                        subtitle={rowSubtitle(e)}
                        last={null}
                        onPress={() =>
                          router.push({ pathname: '/exercises/[id]', params: { id: e.id } })
                        }
                        divider={i < s.data.length - 1}
                      />
                    ))}
                  </View>
                </View>
              ))
            )}
            {b.filtering && b.filtered.length ? (
              <Text className="text-center type-caption text-text-muted">
                {b.filtered.length} of {b.all.length}
              </Text>
            ) : null}
          </ScrollView>

          {b.letters.size > 1 ? (
            <View className="absolute top-2 right-1 bottom-6 justify-center">
              <AlphabetScrubber
                active={b.letters}
                onSelect={(l) => {
                  const y = offsets.current.get(l);
                  if (y !== undefined)
                    scroll.current?.scrollTo({ y: Math.max(0, y - space[2]), animated: false });
                }}
              />
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}
