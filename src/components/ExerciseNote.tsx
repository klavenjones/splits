import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';

import { NOTES_MAX } from '@/exercises/validate';
import { useExerciseNote, useNotes } from '@/store/notes';
import { useTheme } from '../theme/useTheme';
import { cn } from './cn';
import { Icon } from './Icon';
import { MicroLabel } from './primitives';

/**
 * The user's private note on an exercise ("seat height 4"). Shows the note, or "add note"; tap to
 * edit in place. It is saved when the field loses focus or goes away, so there is no save button.
 * Native only (notes live in on-device SQLite until they sync).
 */
export function ExerciseNote({
  exerciseId,
  labelled,
  className,
}: {
  exerciseId: string;
  /** Shows a "your notes" micro label above (the exercise detail screen). */
  labelled?: boolean;
  className?: string;
}) {
  const { c } = useTheme();
  const note = useExerciseNote(exerciseId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note);

  // The latest draft for the unmount flush; `done` stops blur and unmount saving it twice.
  const latest = useRef({ editing, draft, note, exerciseId });
  useEffect(() => {
    latest.current = { editing, draft, note, exerciseId };
  });
  const flush = () => {
    const l = latest.current;
    if (!l.editing) return;
    latest.current = { ...l, editing: false };
    if (l.draft.trim() !== l.note) useNotes.getState().setNote(l.exerciseId, l.draft);
  };
  useEffect(() => flush, []);

  if (Platform.OS === 'web') return null;

  if (!editing) {
    return (
      <Pressable
        onPress={() => {
          setDraft(note);
          setEditing(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={note ? `Edit note: ${note}` : 'Add a note'}
        className={cn('active:opacity-70', className)}
      >
        {labelled ? <MicroLabel>your notes</MicroLabel> : null}
        <View className="flex-row items-start gap-2">
          <Icon name="info" size={16} color={c.textMuted} />
          <Text
            className={cn('flex-1 type-caption', note ? 'text-text' : 'text-text-muted')}
            numberOfLines={labelled ? undefined : 2}
          >
            {note || 'add note'}
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View className={className}>
      {labelled ? <MicroLabel>your notes</MicroLabel> : null}
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onBlur={() => {
          flush();
          setEditing(false);
        }}
        autoFocus
        multiline
        maxLength={NOTES_MAX}
        placeholder="Seat height, grip, an injury to watch…"
        placeholderTextColor={c.textMuted}
        accessibilityLabel="Exercise note"
        className="min-h-[44px] rounded-sm border-[1.5px] border-hairline bg-surface-card px-3 py-2 type-body text-text"
        style={{ textAlignVertical: 'top' }}
      />
    </View>
  );
}
