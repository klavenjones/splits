import { useState } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { ALPHABET } from '../exercises/sections';
import { size } from '../theme/tokens';
import { cn } from './cn';

type Letter = (typeof ALPHABET)[number];

const BUBBLE = size.fabSize;

/**
 * The A–Z index rail at the right edge of a list. Touch or drag to jump; a lift-red bubble shows
 * the current letter. Letters with no entries are dimmed and skipped to the nearest active one.
 * VoiceOver users get an adjustable control (swipe up/down).
 */
export function AlphabetScrubber({
  active,
  onSelect,
}: {
  active: ReadonlySet<Letter>;
  onSelect: (letter: Letter) => void;
}) {
  const [height, setHeight] = useState(0);
  const [touch, setTouch] = useState<{ letter: Letter; y: number } | null>(null);
  const [a11yIndex, setA11yIndex] = useState(0);
  const enabled = ALPHABET.filter((l) => active.has(l));
  const rowH = height / ALPHABET.length;

  /** The letter under y, or the nearest active one. */
  const letterAt = (y: number): Letter | null => {
    if (!enabled.length || rowH === 0) return null;
    const i = Math.max(0, Math.min(ALPHABET.length - 1, Math.floor(y / rowH)));
    if (active.has(ALPHABET[i])) return ALPHABET[i];
    let best: Letter | null = null;
    let bestD = Infinity;
    for (const l of enabled) {
      const d = Math.abs(ALPHABET.indexOf(l) - i);
      if (d < bestD) [best, bestD] = [l, d];
    }
    return best;
  };

  const move = (y: number) => {
    const l = letterAt(y);
    if (!l) return;
    if (l !== touch?.letter) onSelect(l);
    setTouch({ letter: l, y: (ALPHABET.indexOf(l) + 0.5) * rowH });
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => move(e.y))
    .onUpdate((e) => move(e.y))
    .onFinalize(() => setTouch(null));

  const step = (dir: 1 | -1) => {
    if (!enabled.length) return;
    const i = Math.max(0, Math.min(enabled.length - 1, a11yIndex + dir));
    setA11yIndex(i);
    onSelect(enabled[i]);
  };

  return (
    <View className="flex-row items-stretch">
      {touch ? (
        <View
          pointerEvents="none"
          className="absolute items-center justify-center rounded-pill bg-lift-fill shadow-float"
          style={{ width: BUBBLE, height: BUBBLE, right: size.touchMin, top: touch.y - BUBBLE / 2 }}
        >
          <Text className="type-title text-on-lift">{touch.letter}</Text>
        </View>
      ) : null}
      <GestureDetector gesture={pan}>
        <View
          onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
          className="justify-between rounded-pill bg-surface-inset px-1.5 py-2"
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Jump to letter"
          accessibilityValue={{ text: enabled[a11yIndex] ?? '' }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        >
          {ALPHABET.map((l) => (
            <Text
              key={l}
              className={cn(
                'text-center type-micro',
                touch?.letter === l
                  ? 'text-lift-text'
                  : active.has(l)
                    ? 'text-text'
                    : 'text-text-disabled',
              )}
            >
              {l}
            </Text>
          ))}
        </View>
      </GestureDetector>
    </View>
  );
}
