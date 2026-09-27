import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { FOCUS_LABEL, type Focus } from '../engine/focus';
import { duration, easing, size, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { cn } from './cn';
import { Icon } from './Icon';

const STOPS: Focus[] = ['run_first', 'balanced', 'lift_first'];
const TRACK_H = size.controlH + space[2];
const THUMB = size.controlH;
const INSET = (TRACK_H - THUMB) / 2;

/**
 * Run ↔ lift slider with three stops (run-first, balanced, lift-first).
 * Drag or tap to choose; VoiceOver swipes up/down to adjust.
 */
export function FocusSlider({ value, onChange }: { value: Focus; onChange: (f: Focus) => void }) {
  const { c } = useTheme();
  const [width, setWidth] = useState(0);
  const travel = Math.max(0, width - THUMB - INSET * 2);
  const index = STOPS.indexOf(value);
  const x = useSharedValue(0);
  const [dragging, setDragging] = useState(false);

  const snapTo = (i: number) => {
    x.set(
      withTiming((i / 2) * travel, {
        duration: duration.fast,
        easing: Easing.bezier(...easing.standard),
      }),
    );
  };

  useEffect(() => {
    x.set((index / 2) * travel);
  }, [index, travel, x]);

  const nearest = (pos: number) =>
    travel === 0 ? index : Math.max(0, Math.min(2, Math.round((pos / travel) * 2)));

  const choose = (i: number) => {
    snapTo(i);
    if (STOPS[i] !== value) onChange(STOPS[i]);
  };

  const start = useSharedValue(0);
  const pan = Gesture.Pan()
    .runOnJS(true)
    .onBegin(() => {
      start.set(x.get());
      setDragging(true);
    })
    .onUpdate((e) => {
      x.set(Math.max(0, Math.min(travel, start.get() + e.translationX)));
    })
    .onFinalize(() => {
      setDragging(false);
      choose(nearest(x.get()));
    });
  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e) => choose(nearest(e.x - INSET - THUMB / 2)));

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View className="gap-3">
      <View className="items-center">
        <View className="rounded-pill bg-primary-fill px-4 py-1.5">
          <Text className="type-label text-on-primary">{FOCUS_LABEL[value]}</Text>
        </View>
      </View>

      <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
        <View
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Training focus"
          accessibilityValue={{ text: FOCUS_LABEL[value] }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) =>
            choose(
              Math.max(0, Math.min(2, index + (e.nativeEvent.actionName === 'increment' ? 1 : -1))),
            )
          }
          className="flex-row overflow-hidden rounded-pill"
          style={{ height: TRACK_H }}
        >
          <View className="flex-1 flex-row items-center gap-2 bg-run-fill pl-5">
            <Icon name="run" size={size.iconMd} color={c.onRun} />
            <Text className="type-label text-on-run">run</Text>
          </View>
          <View className="flex-1 flex-row items-center justify-end gap-2 bg-lift-fill pr-5">
            <Text className="type-label text-on-lift">lift</Text>
            <Icon name="lift" size={size.iconMd} color={c.onLift} />
          </View>

          <Animated.View
            pointerEvents="none"
            className={cn(
              'absolute items-center justify-center rounded-pill bg-surface-card shadow-float',
              dragging && 'border-4 border-glass-edge',
            )}
            style={[{ left: INSET, top: INSET, width: THUMB, height: THUMB }, thumbStyle]}
          >
            <View className="flex-row gap-1">
              {[0, 1, 2].map((i) => (
                <View key={i} className="h-5 w-0.5 rounded-pill bg-text" />
              ))}
            </View>
          </Animated.View>
        </View>
      </GestureDetector>

      <View className="flex-row justify-between">
        {STOPS.map((s) => (
          <Text
            key={s}
            onPress={() => choose(STOPS.indexOf(s))}
            className={cn(
              'type-subhead',
              s === value ? 'font-body-bold text-text' : 'text-text-muted',
            )}
          >
            {FOCUS_LABEL[s]}
          </Text>
        ))}
      </View>
    </View>
  );
}
