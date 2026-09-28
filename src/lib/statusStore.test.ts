import { createStatus } from './statusStore';

describe('createStatus', () => {
  it('records a failure and clears it on success, notifying listeners', () => {
    const s = createStatus();
    const seen: boolean[] = [];
    s.subscribe(() => seen.push(s.get().failed));
    expect(s.get()).toEqual({ failed: false, code: null, at: null });
    s.fail('42501', 1000);
    expect(s.get()).toEqual({ failed: true, code: '42501', at: 1000 });
    s.ok();
    s.ok(); // already clear: no extra notification
    expect(s.get().failed).toBe(false);
    expect(seen).toEqual([true, false]);
  });
});
