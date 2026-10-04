import { withStep } from '@/lib/errors';

import { runImport } from './runImport';

const mockReport = jest.fn();
const mockFail = jest.fn();
const mockOk = jest.fn();
const mockImportNow = jest.fn();
let mockProtected = true;

jest.mock('@/lib/sentry', () => ({
  report: (...a: unknown[]) => mockReport(...a),
  setSpanAttributes: jest.fn(),
  trace: (_n: string, _a: unknown, fn: () => unknown) => fn(),
}));
jest.mock('./importStatus', () => ({
  importStatus: { fail: (...a: unknown[]) => mockFail(...a), ok: () => mockOk() },
}));
jest.mock('./connection', () => ({ importNow: (...a: unknown[]) => mockImportNow(...a) }));
jest.mock('./healthkit', () => ({ isProtectedDataAvailable: () => mockProtected }));

const fail = (step: string, e: unknown) => {
  mockImportNow.mockImplementationOnce(() => withStep(step, () => Promise.reject(e)));
};

describe('runImport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProtected = true;
  });

  it('skips quietly while the phone is locked', async () => {
    mockProtected = false;
    await expect(runImport('u', 'metric')).resolves.toBeNull();
    expect(mockImportNow).not.toHaveBeenCalled();
    expect(mockOk).not.toHaveBeenCalled();
    expect(mockFail).not.toHaveBeenCalled();
  });

  it('does not report offline or protected-data failures', async () => {
    const lost = new Error('fetch failed: The network connection was lost.');
    fail('import_run', lost);
    await expect(runImport('u', 'metric')).rejects.toBe(lost);
    const locked = new Error(
      'Error Domain=com.apple.healthkit Code=6 "Protected health data is inaccessible"',
    );
    fail('healthkit_read', locked);
    await expect(runImport('u', 'metric')).rejects.toBe(locked);
    expect(mockReport).not.toHaveBeenCalled();
    expect(mockFail).not.toHaveBeenCalled();
  });

  it('reports other failures once per step, tagged with the step', async () => {
    const denied = { code: '42501', message: 'permission denied' };
    fail('import_body_mass', denied);
    await expect(runImport('u', 'metric')).rejects.toBe(denied);
    fail('import_body_mass', denied);
    await expect(runImport('u', 'metric')).rejects.toBe(denied);
    expect(mockReport).toHaveBeenCalledTimes(1);
    expect(mockReport).toHaveBeenCalledWith(denied, 'health_import', undefined, {
      step: 'import_body_mass',
    });
    // The same code from a different step is a different problem.
    const other = { code: '42501', message: 'permission denied' };
    fail('import_run', other);
    await expect(runImport('u', 'metric')).rejects.toBe(other);
    expect(mockReport).toHaveBeenCalledTimes(2);
  });
});
