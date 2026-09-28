import {
  Text,
  View,
  Pressable,
  ActivityIndicator,
  type ViewProps,
  type TextProps,
  type PressableProps,
} from 'react-native';
import { cn } from './cn';
import { Icon, type IconName } from './Icon';
import { useTheme } from '../theme/useTheme';

export type Kind = 'run' | 'lift' | 'fuel' | 'body';
export const KIND_ICON: Record<Kind | 'pr' | 'new', IconName> = {
  run: 'run',
  lift: 'lift',
  fuel: 'fuel',
  body: 'body',
  pr: 'trophy',
  new: 'sparkle',
};
export const KIND_LABEL: Record<Kind | 'pr' | 'new', string> = {
  run: 'Run',
  lift: 'Lift',
  fuel: 'Fuel',
  body: 'Body',
  pr: 'PR',
  new: 'New',
};

/** Small UPPERCASE metadata label: SET 2, REST, 7-DAY AVERAGE. */
export function MicroLabel({ className, ...p }: TextProps & { className?: string }) {
  return <Text className={cn('type-micro text-text-muted', className)} {...p} />;
}

/**
 * White rounded card lifted by shadow-card. Never a border.
 * Padding is its own prop (default p-5) so it never fights a padding class in className.
 */
export function Card({
  className,
  padding = 'p-5',
  ...p
}: ViewProps & { className?: string; padding?: string }) {
  return (
    <View className={cn('rounded-card bg-surface-card shadow-card', padding, className)} {...p} />
  );
}

/** The one high-contrast card per screen: navy in light mode, cream in dark mode. */
export function AnchorCard({
  title,
  icon,
  className,
  children,
  ...p
}: ViewProps & { title: string; icon?: IconName; className?: string }) {
  const { c } = useTheme();
  return (
    <View className={cn('rounded-card bg-anchor-card p-5 shadow-float', className)} {...p}>
      <View className="flex-row items-center justify-between">
        <Text className="type-title text-on-anchor" accessibilityRole="header">
          {title}
        </Text>
        {icon ? <Icon name={icon} size={28} color={c.onAnchor} /> : null}
      </View>
      {children}
    </View>
  );
}

/* ---------------- Button ---------------- */
type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'inverse' | 'run';
const BTN: Record<
  ButtonVariant,
  { box: string; pressed: string; label: string; icon: keyof ReturnType<typeof useTheme>['c'] }
> = {
  primary: {
    box: 'bg-primary-fill',
    pressed: 'bg-primary-pressed',
    label: 'text-on-primary',
    icon: 'onPrimary',
  },
  secondary: {
    box: 'bg-surface-control',
    pressed: 'bg-surface-control-pressed',
    label: 'text-text',
    icon: 'text',
  },
  destructive: {
    box: 'bg-danger-fill',
    pressed: 'bg-danger-pressed',
    label: 'text-on-danger',
    icon: 'onDanger',
  },
  run: { box: 'bg-run-fill', pressed: 'bg-run-pressed', label: 'text-on-run', icon: 'onRun' },
  ghost: { box: 'bg-transparent', pressed: 'bg-surface-control', label: 'text-text', icon: 'text' },
  inverse: {
    box: 'bg-on-anchor',
    pressed: 'bg-on-anchor opacity-85',
    label: 'text-anchor-card',
    icon: 'anchorCard',
  },
};
const BTN_SIZE = { lg: 'h-13 px-6', md: 'h-11 px-5', sm: 'h-9 px-4' } as const;

export type ButtonProps = Omit<PressableProps, 'children'> & {
  children: string;
  variant?: ButtonVariant;
  size?: keyof typeof BTN_SIZE;
  icon?: IconName;
  loading?: boolean;
  block?: boolean;
  className?: string;
};

/** Pill button. Labels are lowercase verbs. One primary per screen. */
export function Button({
  children,
  variant = 'primary',
  size = 'lg',
  icon,
  loading,
  block,
  disabled,
  className,
  ...p
}: ButtonProps) {
  const { c } = useTheme();
  const v = BTN[variant];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={off}
      hitSlop={size === 'sm' ? 4 : undefined}
      className={cn(
        'flex-row items-center justify-center gap-2 rounded-pill',
        BTN_SIZE[size],
        block && 'self-stretch',
        className,
      )}
      {...p}
    >
      {({ pressed }) => (
        <>
          <View
            className={cn(
              'absolute inset-0 rounded-pill',
              disabled ? 'bg-surface-control' : pressed ? v.pressed : v.box,
            )}
            style={pressed && !disabled ? { transform: [{ scale: 0.97 }] } : undefined}
          />
          {loading ? (
            <ActivityIndicator size="small" color={c[v.icon]} />
          ) : icon ? (
            <View>
              <Icon name={icon} size={20} color={disabled ? c.textDisabled : c[v.icon]} />
            </View>
          ) : null}
          <Text
            className={cn(
              size === 'lg' ? 'type-body-strong' : 'type-label',
              disabled ? 'text-text-disabled' : v.label,
            )}
          >
            {children}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** Round 44pt icon button. `label` is its accessible name. */
export function IconButton({
  icon,
  label,
  variant = 'soft',
  className,
  ...p
}: Omit<PressableProps, 'children'> & {
  icon: IconName;
  label: string;
  variant?: 'plain' | 'soft' | 'filled';
  className?: string;
}) {
  const { c } = useTheme();
  const box =
    variant === 'soft'
      ? 'bg-surface-card shadow-raised'
      : variant === 'filled'
        ? 'bg-primary-fill'
        : 'bg-transparent';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      className={cn(
        'h-11 w-11 items-center justify-center rounded-pill active:opacity-70',
        box,
        className,
      )}
      {...p}
    >
      <Icon name={icon} size={24} color={variant === 'filled' ? c.onPrimary : c.text} />
    </Pressable>
  );
}

/* ---------------- Tag ---------------- */
const TAG: Record<
  string,
  {
    soft: string;
    solid: string;
    softText: string;
    solidText: string;
    softIcon: string;
    solidIcon: string;
  }
> = {
  run: {
    soft: 'bg-run-soft',
    solid: 'bg-run-fill',
    softText: 'text-run-text',
    solidText: 'text-on-run',
    softIcon: 'runText',
    solidIcon: 'onRun',
  },
  lift: {
    soft: 'bg-lift-soft',
    solid: 'bg-lift-fill',
    softText: 'text-lift-text',
    solidText: 'text-on-lift',
    softIcon: 'liftText',
    solidIcon: 'onLift',
  },
  fuel: {
    soft: 'bg-fuel-soft',
    solid: 'bg-fuel-fill',
    softText: 'text-fuel-text',
    solidText: 'text-on-fuel',
    softIcon: 'fuelText',
    solidIcon: 'onFuel',
  },
  body: {
    soft: 'bg-body-soft',
    solid: 'bg-body-fill',
    softText: 'text-body-text',
    solidText: 'text-on-body',
    softIcon: 'bodyText',
    solidIcon: 'onBody',
  },
  pr: {
    soft: 'bg-lift-fill',
    solid: 'bg-lift-fill',
    softText: 'text-on-lift',
    solidText: 'text-on-lift',
    softIcon: 'onLift',
    solidIcon: 'onLift',
  },
  new: {
    soft: 'bg-primary-fill',
    solid: 'bg-primary-fill',
    softText: 'text-on-primary',
    solidText: 'text-on-primary',
    softIcon: 'onPrimary',
    solidIcon: 'onPrimary',
  },
};

/** Uppercase pill naming what something is. Always word + icon, never color alone. */
export function Tag({
  kind,
  solid,
  size = 'md',
  children,
}: {
  kind: Kind | 'pr' | 'new';
  solid?: boolean;
  size?: 'md' | 'sm';
  children?: string;
}) {
  const { c } = useTheme();
  const t = TAG[kind];
  return (
    <View
      className={cn(
        'flex-row items-center self-start rounded-pill',
        size === 'sm' ? 'h-6 gap-1 pr-2.5 pl-2' : 'h-7 gap-1.5 pr-3 pl-2.5',
        solid ? t.solid : t.soft,
      )}
    >
      <Icon
        name={KIND_ICON[kind]}
        size={size === 'sm' ? 13 : 14}
        color={c[(solid ? t.solidIcon : t.softIcon) as keyof typeof c]}
      />
      <Text
        className={cn(
          'font-body-bold uppercase',
          size === 'md'
            ? 'text-[13px] leading-4 tracking-[0.8px]'
            : 'text-[11px] leading-[14px] tracking-[0.9px]',
          solid ? t.solidText : t.softText,
        )}
      >
        {children ?? KIND_LABEL[kind]}
      </Text>
    </View>
  );
}
