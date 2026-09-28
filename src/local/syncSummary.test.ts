import { syncSummary } from './syncSummary';

const base = { pending: 0, online: true, running: false, failures: 0, lastError: null };

describe('syncSummary', () => {
  it('shows nothing when everything is synced', () => {
    expect(syncSummary(base)).toBeNull();
  });
  it('says what is waiting and why', () => {
    expect(syncSummary({ ...base, pending: 1 })).toEqual({
      label: '1 workout to sync',
      status: 'local',
      detail: 'tap to sync now',
    });
    expect(syncSummary({ ...base, pending: 2, online: false })).toMatchObject({
      label: '2 workouts to sync',
      detail: 'offline',
    });
    expect(syncSummary({ ...base, pending: 1, failures: 3, lastError: '23514' })).toMatchObject({
      detail: 'retrying · tap to try now',
    });
    expect(syncSummary({ ...base, pending: 1, running: true })).toMatchObject({
      status: 'saving',
    });
  });
});
