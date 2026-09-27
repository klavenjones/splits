import { router } from 'expo-router';

import { currentPickOptions, openPickRequest, pickExercises, settlePick } from './picker';

// Hoisted above the imports by babel-jest.
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

describe('exercise picker requests', () => {
  it('resolves with the ids the sheet confirms', async () => {
    const p = pickExercises({ title: 'add exercises' });
    expect(router.push).toHaveBeenCalledWith('/sheets/pick-exercises');
    expect(currentPickOptions()).toEqual({ title: 'add exercises' });
    settlePick(['a', 'b']);
    await expect(p).resolves.toEqual(['a', 'b']);
    expect(currentPickOptions()).toBeNull();
  });

  it('resolves null on dismiss, and a second settle is a no-op', async () => {
    const p = openPickRequest();
    settlePick(null);
    settlePick(['late']);
    await expect(p).resolves.toBeNull();
  });

  it('cancels the previous request when a new one opens', async () => {
    const first = openPickRequest();
    const second = openPickRequest({ single: true });
    settlePick(['x']);
    await expect(first).resolves.toBeNull();
    await expect(second).resolves.toEqual(['x']);
  });
});
