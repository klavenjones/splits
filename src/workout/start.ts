/**
 * Starting (or resuming) a workout from anywhere: session detail, Today's up-next card, the +
 * sheet. Works offline when the template has been loaded before (the query cache is persisted and
 * this week's templates are prefetched).
 */
import type { QueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { fetchTemplate, templateKey, type TemplateDetail } from '@/db/queries/templates';
import { toLocalDate } from '@/engine/calendar';
import { trace } from '@/lib/sentry';
import { ActiveWorkoutError, useWorkout } from '@/store/workout';

const openLogger = (id: string) => router.push({ pathname: '/workout/[id]', params: { id } });

function alreadyActive(name: string) {
  const active = useWorkout.getState().active;
  Alert.alert(`${name} is in progress`, 'Finish or discard it before starting another workout.', [
    { text: 'cancel', style: 'cancel' },
    ...(active ? [{ text: 'go to workout', onPress: () => openLogger(active.id) }] : []),
  ]);
}

export async function startPlannedSession(
  s: { id: string; name: string; scheduled_date: string; template_id: string | null },
  qc: QueryClient,
) {
  const store = useWorkout.getState();
  if (store.active?.id === s.id) return openLogger(s.id);
  if (store.active) return alreadyActive(store.active.name);
  if (!s.template_id) {
    Alert.alert('No template', 'This session’s template was deleted, so there’s nothing to copy.');
    return;
  }
  const templateId = s.template_id;
  const template =
    qc.getQueryData<TemplateDetail>(templateKey(templateId)) ??
    (await qc
      .fetchQuery({ queryKey: templateKey(templateId), queryFn: () => fetchTemplate(templateId) })
      .catch(() => null));
  if (!template) {
    Alert.alert(
      'Can’t load this template',
      'Connect once so the template can be saved on this phone, then start again.',
    );
    return;
  }
  try {
    openLogger(
      trace('logger.start', { origin: 'planned' }, () =>
        store.startPlanned({ ...s, template_id: templateId }, template),
      ),
    );
  } catch (e) {
    if (e instanceof ActiveWorkoutError) alreadyActive(e.message);
    else throw e;
  }
}

export function startEmptyWorkout() {
  try {
    openLogger(
      trace('logger.start', { origin: 'empty' }, () =>
        useWorkout.getState().startEmpty(toLocalDate(new Date())),
      ),
    );
  } catch (e) {
    if (e instanceof ActiveWorkoutError) alreadyActive(e.message);
    else throw e;
  }
}
