import {
  confirmsReset,
  resetTraining,
  ResetIncompleteError,
  type ResetDeps,
} from './resetTraining';

function setup(over: Partial<ResetDeps> = {}) {
  const log: string[] = [];
  const deps: ResetDeps = {
    pauseSync: async () => {
      log.push('pause');
      return () => void log.push('resume');
    },
    resetServer: async () => {
      log.push('server');
      return 4;
    },
    wipeLocal: () => void log.push('local'),
    cutoffHealth: () => void log.push('health'),
    clearCache: () => void log.push('cache'),
    ...over,
  };
  return { deps, log };
}

describe('resetTraining', () => {
  it('pauses sync, clears the server, then this phone, and resumes sync', async () => {
    const { deps, log } = setup();
    await expect(resetTraining(deps)).resolves.toEqual({ deleted: 4 });
    expect(log).toEqual(['pause', 'server', 'local', 'health', 'cache', 'resume']);
  });

  it('leaves the phone alone when the server call fails, and still resumes sync', async () => {
    const boom = new Error('Network request failed');
    const { deps, log } = setup({
      resetServer: async () => {
        log.push('server');
        throw boom;
      },
    });
    await expect(resetTraining(deps)).rejects.toBe(boom);
    expect(log).toEqual(['pause', 'server', 'resume']);
  });

  it('says so when the server is cleared but this phone could not finish', async () => {
    const { deps, log } = setup({
      wipeLocal: () => {
        throw new Error('disk full');
      },
    });
    await expect(resetTraining(deps)).rejects.toBeInstanceOf(ResetIncompleteError);
    expect(log).toEqual(['pause', 'server', 'resume']);
  });

  it('does not start if sync cannot be paused', async () => {
    const { deps, log } = setup({
      pauseSync: async () => {
        throw new Error('stuck');
      },
    });
    await expect(resetTraining(deps)).rejects.toThrow('stuck');
    expect(log).toEqual([]);
  });
});

describe('confirmsReset', () => {
  it('needs exactly RESET (ignoring surrounding spaces)', () => {
    expect(confirmsReset('RESET')).toBe(true);
    expect(confirmsReset('  RESET ')).toBe(true);
    expect(confirmsReset('reset')).toBe(false);
    expect(confirmsReset('RESE')).toBe(false);
    expect(confirmsReset('RESET RESET')).toBe(false);
    expect(confirmsReset('')).toBe(false);
  });
});
