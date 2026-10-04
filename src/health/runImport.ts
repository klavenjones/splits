import {
  errorCode,
  errorStep,
  isOfflineError,
  isProtectedDataError,
  reportOnce,
} from '@/lib/errors';
import { report, setSpanAttributes, trace } from '@/lib/sentry';

import { importNow } from './connection';
import { isProtectedDataAvailable } from './healthkit';
import { importStatus } from './importStatus';

const reported = reportOnce();

/**
 * importNow with reporting: a traced pass (counts only), failures other than offline sent to
 * Sentry once per step and error code and recorded for Settings, cleared by the next good
 * import. Offline and locked-phone failures are expected and retried, so they aren't reported.
 * Rethrows, so callers can still show the message.
 */
export function runImport(userId: string, units: 'imperial' | 'metric') {
  // Locked phone: Health is unreadable. Leave everything as it was; opening the app retries.
  if (!isProtectedDataAvailable()) return Promise.resolve(null);
  return trace('health.import', {}, async () => {
    try {
      const r = await importNow(userId, units);
      if (r) setSpanAttributes({ runs: r.runs, removed: r.removed, weights: r.weights });
      importStatus.ok();
      reported.clearAll();
      return r;
    } catch (e) {
      if (!isOfflineError(e) && !isProtectedDataError(e)) {
        const code = errorCode(e);
        const step = errorStep(e);
        importStatus.fail(code, Date.now());
        if (reported.should(step, code)) report(e, 'health_import', undefined, { step });
      }
      throw e;
    }
  });
}
