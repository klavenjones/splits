import { View, type ViewProps } from 'react-native';

const backgroundClasses = {
  background: 'bg-background',
  backgroundElement: 'bg-background-element',
  backgroundSelected: 'bg-background-selected',
} as const;

export type ThemedViewProps = ViewProps & {
  type?: keyof typeof backgroundClasses;
};

export function ThemedView({ className, type = 'background', ...otherProps }: ThemedViewProps) {
  return <View className={`${backgroundClasses[type]} ${className ?? ''}`} {...otherProps} />;
}
