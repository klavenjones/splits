import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopNav } from './controls';

/**
 * Layout for onboarding and auth steps: back button + step progress, lowercase display title,
 * muted subtitle, scrolling content, and actions pinned to the bottom.
 */
export function StepScreen({
  step,
  total,
  onBack,
  title,
  subtitle,
  children,
  footer,
}: {
  step?: number;
  total?: number;
  onBack?: () => void;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top', 'bottom']} className="flex-1">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerClassName="gap-6 px-5 pb-6 pt-2"
            keyboardShouldPersistTaps="handled"
          >
            {onBack || step ? <TopNav onBack={onBack} step={step} total={total} /> : null}
            <View className="gap-2">
              <Text className="type-display text-text" accessibilityRole="header">
                {title}
              </Text>
              {subtitle ? <Text className="type-body text-text-muted">{subtitle}</Text> : null}
            </View>
            {children}
          </ScrollView>
          {footer ? <View className="gap-3 px-5 pt-3 pb-2">{footer}</View> : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
