import { useRef, useState, type ReactNode } from 'react';
import { Pressable, Text, View, type LayoutRectangle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { size } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { cn } from './cn';
import { Icon } from './Icon';
import { IconButton, MicroLabel } from './primitives';

/* ---------------- WeekSwitcher ---------------- */

/** ‹ "Sep 21 to 27" / "this week" › */
export function WeekSwitcher({
  title,
  subtitle,
  onPrev,
  onNext,
}: {
  title: string;
  subtitle?: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <IconButton icon="chevron-left" label="Previous week" onPress={onPrev} />
      <View className="items-center" accessible accessibilityLiveRegion="polite">
        <Text className="type-headline text-text" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text className="type-subhead text-text-muted">{subtitle}</Text> : null}
      </View>
      <IconButton icon="chevron-right" label="Next week" onPress={onNext} />
    </View>
  );
}

/* ---------------- SummaryTile ---------------- */

/** RUN / LIFT / FOCUS tile above the week: tinted by kind, one big value, a caption. */
export function SummaryTile({
  kind,
  label,
  value,
  unit,
  caption,
  onPress,
}: {
  kind: 'run' | 'lift' | 'plain';
  label: string;
  value: string;
  unit?: string;
  caption: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}, ${caption}`}
      className={cn(
        'flex-1 gap-2 rounded-card px-3.5 py-4 active:opacity-80',
        kind === 'run'
          ? 'bg-run-soft'
          : kind === 'lift'
            ? 'bg-lift-soft'
            : 'bg-surface-card shadow-card',
      )}
    >
      <MicroLabel
        className={
          kind === 'run' ? 'text-run-text' : kind === 'lift' ? 'text-lift-text' : undefined
        }
      >
        {label}
      </MicroLabel>
      <Text
        className="font-display text-[26px] leading-[30px] text-text"
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
        {unit ? <Text className="type-subhead text-text-muted"> {unit}</Text> : null}
      </Text>
      <Text className="type-caption text-text-muted" numberOfLines={1} adjustsFontSizeToFit>
        {caption}
      </Text>
    </Pressable>
  );
}

/* ---------------- PlannedSessionCard ---------------- */

type CardStatus = 'planned' | 'in_progress' | 'completed' | 'skipped';

/** A session on the week: kind bar (dashed while planned), name, meta; check when done. */
export function PlannedSessionCard({
  kind,
  name,
  meta,
  status,
  draggable,
  onPress,
  onMoveDay,
}: {
  kind: 'lift' | 'run';
  name: string;
  meta: string;
  status: CardStatus;
  draggable?: boolean;
  onPress: () => void;
  onMoveDay?: (dir: -1 | 1) => void;
}) {
  const { c } = useTheme();
  const done = status === 'completed';
  const skipped = status === 'skipped';
  const fill = kind === 'lift' ? 'bg-lift-fill' : 'bg-run-fill';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${kind}, ${meta}, ${status.replace('_', ' ')}`}
      accessibilityHint={onMoveDay ? 'Actions move it to the previous or next day.' : undefined}
      accessibilityActions={
        onMoveDay
          ? [
              { name: 'previous', label: 'Move to previous day' },
              { name: 'next', label: 'Move to next day' },
            ]
          : undefined
      }
      onAccessibilityAction={(e) => onMoveDay?.(e.nativeEvent.actionName === 'next' ? 1 : -1)}
      className="flex-row items-center gap-3 rounded-card bg-surface-card py-3.5 pr-4 pl-4 shadow-card active:bg-surface-inset"
    >
      {done || status === 'in_progress' ? (
        <View className={cn('w-1.5 self-stretch rounded-pill', fill)} />
      ) : skipped ? (
        <View className="w-1.5 self-stretch rounded-pill bg-track" />
      ) : (
        <DashedBar className={fill} />
      )}
      <View className="flex-1 gap-0.5">
        <Text
          className={cn('type-headline', skipped ? 'text-text-muted line-through' : 'text-text')}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text className="type-subhead text-text-muted" numberOfLines={1}>
          {skipped ? 'skipped' : meta}
        </Text>
      </View>
      {done ? (
        <View
          className={cn('h-9 w-9 items-center justify-center rounded-pill', fill)}
          accessibilityElementsHidden
        >
          <Icon name="check" size={size.iconMd} color={kind === 'lift' ? c.onLift : c.onRun} />
        </View>
      ) : draggable ? (
        <Icon name="grip" size={size.iconLg} color={c.textSubtle} strokeWidth={3} />
      ) : null}
    </Pressable>
  );
}

/** A vertical dashed bar (a planned session's plate edge): short dashes filling its height. */
export function DashedBar({ className }: { className: string }) {
  const [height, setHeight] = useState(0);
  const count = Math.max(1, Math.floor((height + 4) / 12));
  return (
    <View
      className="w-1.5 gap-1 self-stretch"
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
    >
      {Array.from({ length: height ? count : 0 }, (_, i) => (
        <View key={i} className={cn('h-2 w-1.5 rounded-[2px]', className)} />
      ))}
    </View>
  );
}

/* ---------------- DayRow ---------------- */

/** One day of the week: MON / 21 on the left, sessions (or rest day) on the right. */
export function DayRow({
  code,
  date,
  today,
  highlight,
  dim,
  onAdd,
  children,
}: {
  code: string;
  date: number;
  today?: boolean;
  /** Drop target while dragging. */
  highlight?: boolean;
  dim?: boolean;
  onAdd?: () => void;
  children: ReactNode;
}) {
  const { c } = useTheme();
  return (
    <View
      className={cn(
        'flex-row gap-3 rounded-card p-2',
        today && 'border-[1.5px] border-hairline bg-surface-inset',
        highlight && 'bg-surface-control',
        dim && 'opacity-50',
      )}
    >
      <View className="w-14 items-center gap-0.5 pt-2">
        <MicroLabel className={today ? 'text-text' : undefined}>
          {today ? 'today' : code}
        </MicroLabel>
        <View className={cn('rounded-pill px-2', today && 'bg-primary-fill')}>
          <Text
            className={cn(
              'font-display text-[22px] leading-[28px] tabular-nums',
              today ? 'text-on-primary' : 'text-text',
            )}
          >
            {date}
          </Text>
        </View>
        {onAdd ? (
          <Pressable
            onPress={onAdd}
            accessibilityRole="button"
            accessibilityLabel={`Add a session on ${code} ${date}`}
            hitSlop={8}
            className="h-7 w-7 items-center justify-center rounded-pill active:bg-surface-control"
          >
            <Icon name="plus" size={size.iconSm} color={c.textMuted} />
          </Pressable>
        ) : null}
      </View>
      <View className="flex-1 gap-3">{children}</View>
    </View>
  );
}

/** "rest day" with an optional "+ add a session" pill. */
export function RestDay({ onAdd }: { onAdd?: () => void }) {
  const { c } = useTheme();
  return (
    <View className="min-h-16 flex-row items-center justify-between rounded-card border-[1.5px] border-hairline py-2 pr-2 pl-4">
      <Text className="type-body text-text-muted">rest day</Text>
      {onAdd ? (
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel="Add a session"
          className="h-11 flex-row items-center gap-2 rounded-pill bg-surface-control px-4 active:bg-surface-control-pressed"
        >
          <Icon name="plus" size={size.iconSm} color={c.text} />
          <Text className="type-label text-text">add a session</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ---------------- WeekBoard ---------------- */

export type BoardDay<S> = { date: string; sessions: S[]; accepts: boolean };

/** How the board scrolls its ScrollView while dragging near an edge. */
export type BoardScroller = {
  /** Current scroll offset. */
  y: () => number;
  /** Scrolls by dy (clamped by the owner). */
  by: (dy: number) => void;
  /** The scroll viewport, in window coordinates. */
  viewport: () => { top: number; bottom: number };
};

const EDGE = 80;
const STEP = 10;

/**
 * The week's day rows with press-and-hold-to-move: long-press a draggable card, it lifts and
 * follows the finger; the day under it lights up; release to drop there (`onMove`). Days that
 * don't accept (past days) dim and refuse the drop. Scrolls the page near the edges.
 */
export function WeekBoard<S>({
  days,
  keyOf,
  canDrag,
  renderDay,
  renderCard,
  onMove,
  scroller,
}: {
  days: BoardDay<S>[];
  keyOf: (s: S) => string;
  canDrag: (s: S) => boolean;
  renderDay: (
    day: BoardDay<S>,
    state: { highlight: boolean; dim: boolean },
    children: ReactNode,
  ) => ReactNode;
  renderCard: (s: S, day: BoardDay<S>) => ReactNode;
  onMove: (s: S, date: string) => void;
  scroller?: BoardScroller;
}) {
  const board = useRef<View>(null);
  const rows = useRef(new Map<string, LayoutRectangle>());
  const drag = useRef({
    dragging: false,
    from: '',
    target: null as string | null,
    boardTop: 0,
    scroll0: 0,
    translation: 0,
    fingerY: 0,
    timer: null as ReturnType<typeof setInterval> | null,
  });
  const [active, setActive] = useState<{ key: string; from: string } | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const dragY = useSharedValue(0);

  const measureRow = (date: string, l: LayoutRectangle) => rows.current.set(date, l);

  /** The day under a board-relative y, or null. */
  const dayAt = (y: number) => {
    for (const [date, l] of rows.current) if (y >= l.y && y < l.y + l.height) return date;
    return null;
  };

  const scrolled = () => (scroller ? scroller.y() - drag.current.scroll0 : 0);

  const update = () => {
    const d = drag.current;
    dragY.set(d.translation + scrolled());
    d.target = dayAt(d.fingerY - d.boardTop + scrolled());
    setTarget(d.target);
  };

  const stopScroll = () => {
    if (drag.current.timer) clearInterval(drag.current.timer);
    drag.current.timer = null;
  };

  const edgeScroll = () => {
    if (!scroller) return;
    const { top, bottom } = scroller.viewport();
    const y = drag.current.fingerY;
    const dir = y < top + EDGE ? -1 : y > bottom - EDGE ? 1 : 0;
    stopScroll();
    if (dir)
      drag.current.timer = setInterval(() => {
        scroller.by(dir * STEP);
        update();
      }, 16);
  };

  const start = (key: string, from: string, absoluteY: number) => {
    drag.current.dragging = true;
    drag.current.from = from;
    drag.current.target = from;
    drag.current.translation = 0;
    drag.current.fingerY = absoluteY;
    drag.current.scroll0 = scroller?.y() ?? 0;
    dragY.set(0);
    setActive({ key, from });
    setTarget(from);
    board.current?.measureInWindow((_x, y) => {
      drag.current.boardTop = y;
    });
  };

  const move = (translationY: number, absoluteY: number) => {
    drag.current.translation = translationY;
    drag.current.fingerY = absoluteY;
    update();
    edgeScroll();
  };

  const finish = (s: S) => {
    if (!drag.current.dragging) return;
    stopScroll();
    const { from, target: to } = drag.current;
    drag.current.dragging = false;
    setActive(null);
    setTarget(null);
    dragY.set(0);
    const day = days.find((d) => d.date === to);
    if (to && to !== from && day?.accepts) onMove(s, to);
  };

  return (
    <View ref={board} className="gap-3">
      {days.map((day) => {
        const holdsActive = !!active && day.date === active.from;
        const cards = day.sessions.map((s) => {
          const key = keyOf(s);
          const isActive = active?.key === key;
          const card = renderCard(s, day);
          if (!canDrag(s)) return <View key={key}>{card}</View>;
          return (
            <DraggableCard
              key={key}
              lifted={isActive}
              dragY={dragY}
              onDragStart={(y) => start(key, day.date, y)}
              onDragMove={move}
              onDragEnd={() => finish(s)}
            >
              {card}
            </DraggableCard>
          );
        });
        return (
          <View
            key={day.date}
            onLayout={(e) => measureRow(day.date, e.nativeEvent.layout)}
            style={{ zIndex: holdsActive ? 10 : 0 }}
          >
            {renderDay(
              day,
              {
                highlight:
                  !!active && target === day.date && day.date !== active.from && day.accepts,
                dim: !!active && !day.accepts,
              },
              cards,
            )}
          </View>
        );
      })}
    </View>
  );
}

/** A card that lifts after a long press and reports the drag to the board. */
function DraggableCard({
  lifted,
  dragY,
  onDragStart,
  onDragMove,
  onDragEnd,
  children,
}: {
  lifted: boolean;
  dragY: SharedValue<number>;
  onDragStart: (absoluteY: number) => void;
  onDragMove: (translationY: number, absoluteY: number) => void;
  onDragEnd: () => void;
  children: ReactNode;
}) {
  const pan = Gesture.Pan()
    .runOnJS(true)
    .activateAfterLongPress(300)
    .onStart((e) => onDragStart(e.absoluteY))
    .onUpdate((e) => onDragMove(e.translationY, e.absoluteY))
    .onFinalize(() => onDragEnd());
  const style = useAnimatedStyle(() =>
    lifted
      ? {
          transform: [{ translateY: dragY.get() }, { scale: 1.03 }, { rotate: '-1.5deg' }],
          zIndex: 10,
        }
      : { transform: [{ translateY: 0 }, { scale: 1 }, { rotate: '0deg' }], zIndex: 0 },
  );
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={style}>{children}</Animated.View>
    </GestureDetector>
  );
}

/* ---------------- Dialog ---------------- */

/** A centered card over the scrim. Tapping the scrim calls onDismiss. */
export function Dialog({ onDismiss, children }: { onDismiss: () => void; children: ReactNode }) {
  return (
    <View className="flex-1 items-center justify-center bg-scrim px-6">
      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Close"
        className="absolute inset-0"
      />
      <View
        accessibilityViewIsModal
        className="w-full gap-4 rounded-sheet bg-surface-raised p-6 shadow-float"
      >
        {children}
      </View>
    </View>
  );
}
