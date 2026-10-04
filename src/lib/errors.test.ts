import {
  asError,
  errorCode,
  errorStep,
  isOfflineError,
  isProtectedDataError,
  reportOnce,
  withStep,
} from './errors';

describe('errors', () => {
  it('recognises offline and timeout failures', () => {
    expect(isOfflineError(new TypeError('Network request failed'))).toBe(true);
    expect(isOfflineError({ message: 'TypeError: Network request failed', code: '' })).toBe(true);
    expect(isOfflineError(new Error('The request timed out.'))).toBe(true);
    expect(isOfflineError({ code: '23514', message: 'violates check constraint' })).toBe(false);
    expect(isOfflineError(new Error('boom'))).toBe(false);
  });

  it('treats a lost connection as offline', () => {
    expect(
      isOfflineError(
        new Error('fetch failed: UnexpectedException: The network connection was lost.'),
      ),
    ).toBe(true);
  });

  it('recognises HealthKit protected-data errors', () => {
    const msg =
      'Error Domain=com.apple.healthkit Code=6 "Protected health data is inaccessible" UserInfo={}';
    expect(isProtectedDataError(new Error(msg))).toBe(true);
    expect(isProtectedDataError({ message: msg })).toBe(true);
    expect(isProtectedDataError(new Error('Error Domain=com.apple.healthkit Code=5'))).toBe(false);
    expect(isProtectedDataError({ code: '42501', message: 'permission denied' })).toBe(false);
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
    expect((e as Error & { code?: string }).code).toBe('23514');
    expect((e as Error & { cause?: unknown }).cause).toMatchObject({ details: 'row' });
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

  it('tags failures with the step that threw', async () => {
    const plain = { code: '42501', message: 'denied' };
    await expect(withStep('import_body_mass', () => Promise.reject(plain))).rejects.toBe(plain);
    expect(errorStep(plain)).toBe('import_body_mass');
    // The first step to see an error keeps it.
    await expect(withStep('outer', () => Promise.reject(plain))).rejects.toBe(plain);
    expect(errorStep(plain)).toBe('import_body_mass');
    expect(errorStep(new Error('x'))).toBe('import');
    expect(errorStep('x', 'other')).toBe('other');
  });

  it('keeps separate steps from de-duplicating each other, and clears all on success', () => {
    const r = reportOnce();
    expect(r.should('import_run', '42501')).toBe(true);
    expect(r.should('import_body_mass', '42501')).toBe(true);
    expect(r.should('import_body_mass', '42501')).toBe(false);
    r.clearAll();
    expect(r.should('import_body_mass', '42501')).toBe(true);
  });
});
