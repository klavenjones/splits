import { clearDraft, getDraft, startDraft, updateDraft } from './draftStore';

describe('draftStore', () => {
  it('starts, updates and clears one draft', () => {
    expect(getDraft()).toBeNull();
    updateDraft((d) => ({ ...d, name: 'ignored' }));
    expect(getDraft()).toBeNull();
    startDraft({ id: null, name: 'upper A', notes: '', kind: 'lift', lift: [], run: [] });
    updateDraft((d) => ({ ...d, name: 'upper B' }));
    expect(getDraft()?.name).toBe('upper B');
    clearDraft();
    expect(getDraft()).toBeNull();
  });
});
