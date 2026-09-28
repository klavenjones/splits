import * as Sentry from '@sentry/react-native';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { EmptyState } from './exercises';
import { Button } from './primitives';
import { SafeAreaView } from './SafeAreaView';
import { TipCard } from './cards';

type Props = {
  /** Names the boundary in Sentry (tag `boundary`), e.g. "checkin" or "today.runs". */
  name: string;
  /** What couldn't be shown, e.g. "couldn't show your runs". */
  title: string;
  body?: string;
  /** Full screen (a route) instead of an inline card. */
  screen?: boolean;
  /** Full screen only: a second action, e.g. close the modal. Gets `reset` to clear the error. */
  onClose?: (reset: () => void) => void;
  closeLabel?: string;
  children: ReactNode;
};

/**
 * Catches a render error below it, reports it (scrubbed, tagged `area: render`) and shows a
 * fallback with "try again", which re-renders the children. The rest of the screen keeps working.
 */
export function ErrorBoundary({
  name,
  title,
  body,
  screen,
  onClose,
  closeLabel = 'close',
  children,
}: Props) {
  return (
    <Sentry.ErrorBoundary
      beforeCapture={(scope) => {
        scope.setTag('area', 'render');
        scope.setTag('boundary', name);
      }}
      fallback={({ resetError }) =>
        screen ? (
          <View className="flex-1 bg-bg">
            <SafeAreaView className="flex-1 justify-center px-6">
              <EmptyState
                icon="alert"
                title={title}
                body={body ?? 'Something went wrong on this screen. It’s been reported.'}
              >
                <View className="w-full gap-3 pt-2">
                  <Button block icon="undo" onPress={resetError}>
                    try again
                  </Button>
                  {onClose ? (
                    <Button block variant="secondary" onPress={() => onClose(resetError)}>
                      {closeLabel}
                    </Button>
                  ) : null}
                </View>
              </EmptyState>
            </SafeAreaView>
          </View>
        ) : (
          <TipCard tone="warning" icon="alert" title={title}>
            <View className="items-start gap-3">
              <Text className="type-body text-text">
                {body ?? 'Something went wrong here. It’s been reported.'}
              </Text>
              <Button size="sm" variant="secondary" icon="undo" onPress={resetError}>
                try again
              </Button>
            </View>
          </TipCard>
        )
      }
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
