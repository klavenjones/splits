import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { useAuth } from '@/auth';
import { ExercisePicker } from '@/components';
import { currentPickOptions, settlePick } from '@/exercises/picker';

/** The exercise picker sheet. Opened with pickExercises(); resolves that promise on close. */
export default function PickExercisesSheet() {
  const { userId } = useAuth();
  const [options] = useState(() => currentPickOptions() ?? {});

  // Swiping the sheet down resolves the request as cancelled.
  useEffect(() => () => settlePick(null), []);

  return (
    <ExercisePicker
      userId={userId}
      title={options.title}
      excludeIds={options.excludeIds}
      single={options.single}
      suggested={options.suggested}
      last={options.last}
      onCancel={() => router.back()}
      onConfirm={(ids) => {
        settlePick(ids);
        router.back();
      }}
      onCreate={(name) =>
        router.push({ pathname: '/exercises/new', params: { name, then: 'back' } })
      }
    />
  );
}
