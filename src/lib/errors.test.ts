import { asError, errorCode, isOfflineError, reportOnce } from './errors';

describe('errors', () => {
  it('recognises offline and timeout failures', () => {
    expect(isOfflineError(new TypeError('Network request failed'))).toBe(true);
    expect(isOfflineError({ message: 'TypeError: Network request failed', code: '' })).toBe(true);
    expect(isOfflineError(new Error('The request timed out.'))).toBe(true);
    expect(isOfflineError({ code: '23514', message: 'violates check constraint' })).toBe(false);
    expect(isOfflineError(new Error('boom'))).toBe(false);
  });

  it('codes errors by PostgREST code, then name', () => {
    expect(errorCode({ code: '42501', message: 'x' })).toBe('42501');
    expect(errorCode(new TypeError('x'))).toBe('TypeError');
    expect(errorCode('x')).toBe('Error');
  });

  it('turns Supabase error objects into Errors with the code in the name', () => {
    const e = asError({ code: '23514', message: 'violates check constraint', details: 'row' });
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('PostgrestError 23514');
    expect(e.message).toBe('violates check constraint');
    const same = new Error('x');
    expect(asError(same)).toBe(same);
  });

  it('reports each key and code once until cleared', () => {
    const r = reportOnce();
    expect(r.should('w1', '23514')).toBe(true);
    expect(r.should('w1', '23514')).toBe(false);
    expect(r.should('w1', '42501')).toBe(true);
    expect(r.should('w2', '42501')).toBe(true);
    r.clear('w1');
    expect(r.should('w1', '42501')).toBe(true);
  });
});
