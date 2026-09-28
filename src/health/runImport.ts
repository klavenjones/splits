import { errorCode, isOfflineError, reportOnce } from '@/lib/errors';
import { report, setSpanAttributes, trace } from '@/lib/sentry';

import { importNow } from './connection';
import { importStatus } from './importStatus';

const reported = reportOnce();

/**
 * importNow with reporting: a traced pass (counts only), failures other than offline sent to
 * Sentry once per error code and recorded for Settings, cleared by the next good import.
 * Rethrows, so callers can still show the message.
 */
export function runImport(userId: string, units: 'imperial' | 'metric') {
  return trace('health.import', {}, async () => {
    try {
      const r = await importNow(userId, units);
      if (r) setSpanAttributes({ runs: r.runs, removed: r.removed, weights: r.weights });
      importStatus.ok();
      reported.clear('import');
      return r;
    } catch (e) {
      if (!isOfflineError(e)) {
        const code = errorCode(e);
        importStatus.fail(code, Date.now());
        if (reported.should('import', code)) report(e, 'health_import');
      }
      throw e;
    }
  });
}
