import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { duration, easing, size } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Icon } from './Icon';

/**
 * A short vertical list reordered by dragging each item's handle. Long-press the handle to lift
 * the card (it scales up and tilts, as in the builder mockups); the others slide aside; release to
 * drop. Items can differ in height. Not virtualized: meant for template-sized lists inside a
 * ScrollView. Nest one inside an item to reorder within a group.
 */
export function SortableList<T>({
  items,
  keyOf,
  renderItem,
  onReorder,
  gap = 12,
}: {
  items: readonly T[];
  keyOf: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  onReorder: (from: number, to: number) => void;
  gap?: number;
}) {
  // Measured heights by index. A plain ref: every item's onLayout fires in the same frame, and
  // read-modify-write on one shared array would lose all but the last.
  const heights = useRef<number[]>([]);
  const activeHeight = useSharedValue(0);
  const active = useSharedValue(-1);
  const target = useSharedValue(-1);
  const dragY = useSharedValue(0);
  const measure = (index: number, h: number) => {
    heights.current[index] = h;
  };
  const heightAt = (index: number) => heights.current[index] ?? 0;
  const shared = {
    measure,
    heightAt,
    activeHeight,
    active,
    target,
    dragY,
    gap,
    count: items.length,
    onReorder,
  };

  return (
    <View style={{ gap }}>
      {items.map((item, i) => (
        <SortableItem key={keyOf(item)} index={i} shared={shared}>
          {renderItem(item, i)}
        </SortableItem>
      ))}
    </View>
  );
}

type Shared = {
  measure: (index: number, h: number) => void;
  heightAt: (index: number) => number;
  activeHeight: SharedValue<number>;
  active: SharedValue<number>;
  target: SharedValue<number>;
  dragY: SharedValue<number>;
  gap: number;
  count: number;
  onReorder: (from: number, to: number) => void;
};

const ItemContext = createContext<{ index: number; shared: Shared } | null>(null);

const slide = { duration: duration.fast, easing: Easing.bezier(...easing.standard) };

function SortableItem({
  index,
  shared,
  children,
}: {
  index: number;
  shared: Shared;
  children: ReactNode;
}) {
  const { measure, activeHeight, active, target, dragY, gap } = shared;
  const style = useAnimatedStyle(() => {
    const a = active.get();
    if (a < 0)
      return { transform: [{ translateY: 0 }, { scale: 1 }, { rotate: '0deg' }], zIndex: 0 };
    if (index === a)
      return {
        transform: [{ translateY: dragY.get() }, { scale: 1.03 }, { rotate: '-1.5deg' }],
        zIndex: 10,
      };
    const t = target.get();
    const shift = activeHeight.get() + gap;
    const y = a < index && index <= t ? -shift : t <= index && index < a ? shift : 0;
    return {
      transform: [{ translateY: withTiming(y, slide) }, { scale: 1 }, { rotate: '0deg' }],
      zIndex: 0,
    };
  });

  return (
    <Animated.View style={style} onLayout={(e) => measure(index, e.nativeEvent.layout.height)}>
      <ItemContext.Provider value={{ index, shared }}>{children}</ItemContext.Provider>
    </Animated.View>
  );
}

/** The drag handle. Put it inside a SortableList item. */
export function DragHandle({ label = 'Reorder' }: { label?: string }) {
  const { c } = useTheme();
  const ctx = useContext(ItemContext);
  const [dragging, setDragging] = useState(false);
  if (!ctx) return null;
  const { index, shared } = ctx;
  const { heightAt, activeHeight, active, target, dragY, gap, count, onReorder } = shared;

  /** Where the dragged item would land: how many other items sit above its center. */
  const landing = (dy: number) => {
    let offset = 0;
    const mids: number[] = [];
    for (let i = 0; i < count; i++) {
      mids.push(offset + heightAt(i) / 2);
      offset += heightAt(i) + gap;
    }
    const center = mids[index] + dy;
    let t = 0;
    for (let i = 0; i < count; i++) if (i !== index && mids[i] < center) t++;
    return t;
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .activateAfterLongPress(180)
    .onStart(() => {
      setDragging(true);
      dragY.set(0);
      activeHeight.set(heightAt(index));
      target.set(index);
      active.set(index);
    })
    .onUpdate((e) => {
      dragY.set(e.translationY);
      target.set(landing(e.translationY));
    })
    .onFinalize(() => {
      if (active.get() !== index) return;
      const to = target.get();
      active.set(-1);
      target.set(-1);
      dragY.set(0);
      setDragging(false);
      if (to >= 0 && to !== index) onReorder(index, to);
    });

  const move = (dir: -1 | 1) => {
    const to = index + dir;
    if (to >= 0 && to < count) onReorder(index, to);
  };

  return (
    <GestureDetector gesture={pan}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityHint="Swipe up or down to move. Or long-press and drag."
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => move(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        className="items-center justify-center"
        style={{ width: size.iconLg + 8, minHeight: size.touchMin, opacity: dragging ? 0.6 : 1 }}
        hitSlop={8}
      >
        <Icon name="grip" size={size.iconLg} color={c.textSubtle} strokeWidth={3} />
      </View>
    </GestureDetector>
  );
}
