import { useState } from 'react';

import { formatNumber, parseNumber } from '@/components';

/**
 * Text state for a number stored in metric but typed in display units. Keeps partial input
 * ("20.") while typing, and re-formats when the display unit changes or the value is set from
 * elsewhere (e.g. the body-fat estimate).
 */
export function useNumberField({
  value,
  onValue,
  toDisplay,
  fromDisplay,
  unitKey,
  decimals = 1,
}: {
  value: number | null;
  onValue: (metric: number | null) => void;
  toDisplay: (metric: number) => number;
  fromDisplay: (display: number) => number;
  /** Changes when the display unit changes (e.g. the unit system). */
  unitKey: string;
  decimals?: number;
}) {
  const format = (v: number | null) => (v === null ? '' : formatNumber(toDisplay(v), decimals));
  const [text, setText] = useState(() => format(value));
  const [seen, setSeen] = useState({ value, unitKey });

  // Adjust during render (not in an effect) when the inputs change underneath the text.
  if (seen.value !== value || seen.unitKey !== unitKey) {
    setSeen({ value, unitKey });
    const parsed = parseNumber(text);
    const typed = parsed === null ? null : fromDisplay(parsed);
    const matches =
      value === null ? typed === null : typed !== null && Math.abs(typed - value) < 1e-6;
    if (seen.unitKey !== unitKey || !matches) setText(format(value));
  }

  const onChangeText = (t: string) => {
    setText(t);
    const n = parseNumber(t);
    onValue(n === null ? null : fromDisplay(n));
  };

  return { value: text, onChangeText };
}
