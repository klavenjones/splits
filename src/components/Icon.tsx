import Svg, { Path } from 'react-native-svg';

/** Splits line icons: 24pt grid, 2pt round strokes. Color comes from the `color` prop (pass a token from useTheme). */
const PATHS = {
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6L6 18',
  'chevron-right': 'M9.5 6l6 6-6 6',
  'chevron-left': 'M14.5 6l-6 6 6 6',
  'chevron-down': 'M6 9.5l6 6 6-6',
  'arrow-up-right': 'M7 17L17 7M8.5 7H17v8.5',
  search: 'M10.5 17a6.5 6.5 0 100-13 6.5 6.5 0 000 13zM15.5 15.5L20 20',
  swap: 'M7 4L4 7l3 3M4 7h13M17 20l3-3-3-3M20 17H7',
  gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7.6 7.6 0 01-2.1 1.2L14.6 21h-4l-.4-2.4a7.6 7.6 0 01-2.1-1.2l-1.9.7-2-3.4 1.6-1.2a7.7 7.7 0 010-2.4L4.2 9.9l2-3.4 1.9.7a7.6 7.6 0 012.1-1.2L10.6 3h4l.4 2.4a7.6 7.6 0 012.1 1.2l1.9-.7 2 3.4-1.6 1.2a7.7 7.7 0 010 2.4z',
  flame: 'M12 21c3.9 0 6.5-2.6 6.5-6.2 0-3.9-3-6.4-4.4-9.8-.8 2.4-2 3.6-3.4 4.4-.4-1-.6-2-.6-3.2C7.6 8 5.5 10.9 5.5 14.8 5.5 18.4 8.1 21 12 21z',
  timer: 'M12 21a8 8 0 100-16 8 8 0 000 16zM12 9v4l2.5 2M10 2h4',
  info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 7.5v.5',
  alert: 'M12 4l9 16H3L12 4zM12 10v4M12 17v.5',
  trophy: 'M8 4h8v5a4 4 0 01-8 0V4zM8 6H5a3 3 0 003 3M16 6h3a3 3 0 01-3 3M12 13v4M8.5 20h7M10 17h4v3h-4z',
  run: 'M4 17.5c2.2 0 3.3-1 4.3-2.6l2.2-3.4c.9-1.4 2-2 3.6-2H17M13 5.5a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0M10.5 11.5l3 2.5-1.5 5M14 13.5l3.5.5 1.5 2.5',
  lift: 'M3 12h18M6 8v8M3.5 9.5v5M18 8v8M20.5 9.5v5',
  fuel: 'M4 11h16a8 8 0 01-16 0zM9 7c0-1.5 1-1.5 1-3M13 7c0-1.5 1-1.5 1-3',
  body: 'M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1zM8.5 9.5a5 5 0 017 0M12 9.5l1.5-1.8',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
  today: 'M12 16a4 4 0 100-8 4 4 0 000 8zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
  plan: 'M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zM4 10h16M8.5 3v4M15.5 3v4',
  progress: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  undo: 'M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 010 11H11',
  trash: 'M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13',
  play: 'M8 5.5v13l10.5-6.5L8 5.5z',
  pause: 'M9 5v14M15 5v14',
  skip: 'M6 5.5v13l9-6.5-9-6.5zM18 5v14',
  backspace: 'M9 5h11v14H9l-6-7 6-7zM12.5 9.5l5 5M17.5 9.5l-5 5',
  globe: 'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.6 3.5 5.6 3.5 9s-1 6.4-3.5 9c-2.5-2.6-3.5-5.6-3.5-9s1-6.4 3.5-9z',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z',
  drop: 'M12 3.5s6 6.4 6 10.5a6 6 0 01-12 0c0-4.1 6-10.5 6-10.5z',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 24, color, strokeWidth = 2 }: { name: IconName; size?: number; color: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d={PATHS[name]} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
