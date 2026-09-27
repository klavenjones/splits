import { Text, type TextProps } from 'react-native';

import type { ThemeColor } from '@/hooks/use-theme';

const typeClasses = {
  default: 'text-body',
  title: 'text-title',
  small: 'text-small',
  smallBold: 'text-small font-bold',
  subtitle: 'text-subtitle',
  link: 'text-small leading-[30px]',
  linkPrimary: 'text-small leading-[30px]',
  code: 'font-mono text-code android:font-bold',
} as const;

const colorClasses: Record<ThemeColor, string> = {
  label: 'text-label',
  labelSecondary: 'text-label-secondary',
  background: 'text-background',
  backgroundElement: 'text-background-element',
  backgroundSelected: 'text-background-selected',
  link: 'text-link',
};

export type ThemedTextProps = TextProps & {
  type?: keyof typeof typeClasses;
  themeColor?: ThemeColor;
};

export function ThemedText({ className, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  // Only one color class at a time: utilities of equal specificity resolve by CSS order, not className order.
  const color = colorClasses[themeColor ?? (type === 'linkPrimary' ? 'link' : 'label')];

  return <Text className={`${typeClasses[type]} ${color} ${className ?? ''}`} {...rest} />;
}
