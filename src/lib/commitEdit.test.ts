import { shouldCommit } from './commitEdit';

describe('shouldCommit', () => {
  it('skips an unchanged field', () => {
    expect(shouldCommit('82.5', '82.5', null)).toBe(false);
  });

  it('commits a changed field', () => {
    expect(shouldCommit('85', '82.5', null)).toBe(true);
  });

  it('skips text that was already reported (blur then return, or blur then unmount)', () => {
    expect(shouldCommit('85', '82.5', '85')).toBe(false);
  });

  it('commits a later edit after an earlier one was reported', () => {
    expect(shouldCommit('90', '82.5', '85')).toBe(true);
  });
});
