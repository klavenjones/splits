/**
 * Charts (victory-native on Skia). They draw once, with no enter animation (Reduce Motion, and
 * Skia issue #4039), label values directly, and bold the current week. Colors come from the
 * theme tokens; labels use the app's Archivo files.
 */
import {
  Circle,
  DashPathEffect,
  Line as SkLine,
  Text as SkText,
  useFont,
  vec,
} from '@shopify/react-native-skia';
import { Pressable, Text, View } from 'react-native';
import { Bar, CartesianChart, Line, Scatter } from 'victory-native';

import { splitsFonts } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';
import { cn } from './cn';
import { Icon, type IconName } from './Icon';

type Kind = 'lift' | 'run' | 'body';

const FILL = { lift: 'liftFill', run: 'runFill', body: 'bodyFill' } as const;
/** No default y axis or grid: the charts draw their own labels. */
const NO_AXIS = { tickCount: 0, lineWidth: 0, lineColor: 'transparent' } as const;

function useChartFonts() {
  const regular = useFont(splitsFonts['Archivo-Medium'], 11);
  const bold = useFont(splitsFonts['Archivo-Bold'], 12);
  return regular && bold ? { regular, bold } : null;
}

/* ---------------- BarChart ---------------- */

export type BarDatum = { label: string; value: number; valueLabel: string; current?: boolean };

/**
 * Weekly bars: a value label above each, the week below; the current bar is solid with bold
 * labels, the others faded. A baseline, no y axis or grid.
 */
export function BarChart({
  bars,
  kind,
  height = 180,
  accessibilityLabel,
  onReady,
}: {
  bars: BarDatum[];
  kind: Kind;
  height?: number;
  accessibilityLabel: string;
  onReady?: () => void;
}) {
  const { c, scheme } = useTheme();
  const fonts = useChartFonts();
  const data = bars.map((b, i) => ({ i, v: b.value }));
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <View
      style={{ height }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      onLayout={fonts ? onReady : undefined}
    >
      {fonts ? (
        <CartesianChart
          data={data}
          xKey="i"
          yKeys={['v']}
          domain={{ y: [0, max * 1.12] }}
          domainPadding={{ left: 22, right: 22 }}
          padding={{ top: 20, bottom: 24 }}
          yAxis={[NO_AXIS]}
          renderOutside={({ points, chartBounds }) => (
            <>
              <SkLine
                p1={vec(chartBounds.left, chartBounds.bottom)}
                p2={vec(chartBounds.right, chartBounds.bottom)}
                color={c.chartGrid}
                strokeWidth={1}
              />
              {points.v.map((p, i) => {
                const b = bars[i];
                if (!b) return null;
                const f = b.current ? fonts.bold : fonts.regular;
                const w = f.measureText(b.valueLabel).width;
                const lw = f.measureText(b.label).width;
                return (
                  <SkLabelPair
                    key={b.label}
                    top={{ x: p.x - w / 2, y: (p.y ?? chartBounds.bottom) - 6, text: b.valueLabel }}
                    bottom={{ x: p.x - lw / 2, y: chartBounds.bottom + 16, text: b.label }}
                    font={f}
                    color={b.current ? c.text : c.textMuted}
                  />
                );
              })}
            </>
          )}
        >
          {({ points, chartBounds }) => {
            const current = points.v.filter((_, i) => bars[i]?.current);
            const rest = points.v.filter((_, i) => !bars[i]?.current);
            return (
              <>
                <Bar
                  points={rest}
                  chartBounds={chartBounds}
                  barCount={bars.length}
                  innerPadding={0.35}
                  roundedCorners={{ topLeft: 6, topRight: 6 }}
                  color={c[FILL[kind]]}
                  opacity={scheme === 'dark' ? 0.55 : 0.35}
                />
                <Bar
                  points={current}
                  chartBounds={chartBounds}
                  barCount={bars.length}
                  innerPadding={0.35}
                  roundedCorners={{ topLeft: 6, topRight: 6 }}
                  color={c[FILL[kind]]}
                />
              </>
            );
          }}
        </CartesianChart>
      ) : null}
    </View>
  );
}

function SkLabelPair({
  top,
  bottom,
  font,
  color,
}: {
  top: { x: number; y: number; text: string };
  bottom: { x: number; y: number; text: string };
  font: NonNullable<ReturnType<typeof useFont>>;
  color: string;
}) {
  return (
    <>
      <SkText x={top.x} y={top.y} text={top.text} font={font} color={color} />
      <SkText x={bottom.x} y={bottom.y} text={bottom.text} font={font} color={color} />
    </>
  );
}

/* ---------------- LineChart ---------------- */

export type LinePoint = { x: number; y: number };

/**
 * Dots (each reading) and a trend line, with three gridlines labelled on the left and the first
 * and last line values labelled directly (the last in bold, with a larger dot). `invert` puts
 * lower values higher (pace: up is faster).
 */
export function LineChart({
  dots,
  line,
  kind,
  domain,
  formatY,
  xLabels,
  invert,
  height = 200,
  accessibilityLabel,
  onReady,
}: {
  dots: LinePoint[];
  line: LinePoint[];
  kind: Kind;
  domain: [number, number];
  formatY: (v: number) => string;
  xLabels: { x: number; label: string; current?: boolean }[];
  invert?: boolean;
  height?: number;
  accessibilityLabel: string;
  onReady?: () => void;
}) {
  const { c } = useTheme();
  const fonts = useChartFonts();
  const sign = invert ? -1 : 1;
  // One data array: dots and line points at their own x values (missing values are skipped).
  const byX = new Map<number, { x: number; dot: number | null; line: number | null }>();
  for (const d of dots) byX.set(d.x, { x: d.x, dot: sign * d.y, line: null });
  for (const l of line)
    byX.set(l.x, { ...(byX.get(l.x) ?? { x: l.x, dot: null }), line: sign * l.y });
  const data = [...byX.values()].sort((a, b) => a.x - b.x);
  const [lo, hi] = domain;
  const yDomain: [number, number] = invert ? [-hi, -lo] : [lo, hi];
  const grid = [0, 0.5, 1].map((t) => lo + (hi - lo) * (0.15 + 0.7 * t));
  const xs = data.map((d) => d.x);
  const xDomain: [number, number] = [
    Math.min(...xs, ...xLabels.map((l) => l.x)),
    Math.max(...xs, ...xLabels.map((l) => l.x)),
  ];
  return (
    <View
      style={{ height }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      onLayout={fonts ? onReady : undefined}
    >
      {fonts && data.length ? (
        <CartesianChart
          data={data}
          xKey="x"
          yKeys={['dot', 'line']}
          domain={{
            x: xDomain[0] === xDomain[1] ? [xDomain[0] - 1, xDomain[1] + 1] : xDomain,
            y: yDomain,
          }}
          domainPadding={{ left: 8, right: 44 }}
          padding={{ top: 12, bottom: 24, left: 44 }}
          yAxis={[NO_AXIS]}
          renderOutside={({ points, xScale, yScale, chartBounds }) => {
            const linePts = points.line.filter((p) => p.y !== null && p.y !== undefined);
            const first = linePts[0];
            const last = linePts[linePts.length - 1];
            return (
              <>
                {grid.map((g) => {
                  const y = yScale(sign * g);
                  return (
                    <SkGridLine
                      key={g}
                      y={y}
                      left={chartBounds.left}
                      right={chartBounds.right}
                      label={formatY(g)}
                      font={fonts.regular}
                      color={c.chartGrid}
                      labelColor={c.textMuted}
                    />
                  );
                })}
                {first && first !== last ? (
                  <SkText
                    x={first.x - 4}
                    y={(first.y ?? 0) + 20}
                    text={formatY(sign * (first.yValue as number))}
                    font={fonts.regular}
                    color={c.textMuted}
                  />
                ) : null}
                {last ? (
                  <>
                    <Circle cx={last.x} cy={last.y ?? 0} r={6} color={c.chartTrend} />
                    <SkText
                      x={
                        last.x -
                        fonts.bold.measureText(formatY(sign * (last.yValue as number))).width / 2
                      }
                      y={(last.y ?? 0) - 12}
                      text={formatY(sign * (last.yValue as number))}
                      font={fonts.bold}
                      color={c.text}
                    />
                  </>
                ) : null}
                {xLabels.map((l) => {
                  const f = l.current ? fonts.bold : fonts.regular;
                  const w = f.measureText(l.label).width;
                  const x = Math.max(
                    chartBounds.left,
                    Math.min(xScale(l.x) - w / 2, chartBounds.right - w),
                  );
                  return (
                    <SkText
                      key={l.label}
                      x={x}
                      y={chartBounds.bottom + 18}
                      text={l.label}
                      font={f}
                      color={l.current ? c.text : c.textMuted}
                    />
                  );
                })}
              </>
            );
          }}
        >
          {({ points }) => (
            <>
              <Scatter points={points.dot} radius={4} color={c[FILL[kind]]} opacity={0.55} />
              <Line
                points={points.line}
                color={c.chartTrend}
                strokeWidth={2.5}
                connectMissingData
                curveType="natural"
              />
            </>
          )}
        </CartesianChart>
      ) : null}
    </View>
  );
}

function SkGridLine({
  y,
  left,
  right,
  label,
  font,
  color,
  labelColor,
}: {
  y: number;
  left: number;
  right: number;
  label: string;
  font: NonNullable<ReturnType<typeof useFont>>;
  color: string;
  labelColor: string;
}) {
  return (
    <>
      <SkLine p1={vec(left, y)} p2={vec(right, y)} color={color} strokeWidth={1}>
        <DashPathEffect intervals={[3, 4]} />
      </SkLine>
      <SkText x={left - 40} y={y + 4} text={label} font={font} color={labelColor} />
    </>
  );
}

/* ---------------- RangeChips ---------------- */

/** 1M · 3M · 6M · all, for chart ranges. */
export function RangeChips<T extends string>({
  ranges,
  value,
  onChange,
}: {
  ranges: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row gap-1.5" accessibilityRole="radiogroup">
      {ranges.map((r) => (
        <Pressable
          key={r}
          onPress={() => onChange(r)}
          accessibilityRole="radio"
          accessibilityState={{ checked: r === value }}
          hitSlop={6}
          className={cn(
            'rounded-pill px-3 py-1.5',
            r === value ? 'bg-text' : 'bg-surface-card shadow-card active:bg-surface-inset',
          )}
        >
          <Text className={cn('type-label', r === value ? 'text-bg' : 'text-text')}>
            {r === 'All' ? 'all' : r}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ---------------- DeltaPill ---------------- */

/**
 * A change, in words with an arrow, never by colour alone: "↗ +10 lb", "−0:30 /mi faster",
 * "no change". Body changes are neutral (weight is data, not good or bad).
 */
export function DeltaPill({
  text,
  direction,
  kind,
  solid,
  icon,
}: {
  text: string;
  direction: 'up' | 'down' | 'flat';
  kind: Kind;
  solid?: boolean;
  icon?: IconName;
}) {
  const { c } = useTheme();
  const box = solid
    ? { lift: 'bg-lift-fill', run: 'bg-run-fill', body: 'bg-body-fill' }[kind]
    : { lift: 'bg-lift-soft', run: 'bg-run-soft', body: 'bg-body-soft' }[kind];
  const label = solid
    ? { lift: 'text-on-lift', run: 'text-on-run', body: 'text-on-body' }[kind]
    : { lift: 'text-lift-text', run: 'text-run-text', body: 'text-body-text' }[kind];
  const iconColor = solid
    ? { lift: c.onLift, run: c.onRun, body: c.onBody }[kind]
    : { lift: c.liftText, run: c.runText, body: c.bodyText }[kind];
  // U+FE0E keeps the arrows as text, not emoji.
  const glyph = direction === 'up' ? '↗\uFE0E' : direction === 'down' ? '↘\uFE0E' : '—';
  return (
    <View className={cn('flex-row items-center gap-1 self-start rounded-pill px-2.5 py-1', box)}>
      {icon ? <Icon name={icon} size={13} color={iconColor} /> : null}
      <Text className={cn('type-label', label)}>
        {icon ? '' : `${glyph} `}
        {text}
      </Text>
    </View>
  );
}
