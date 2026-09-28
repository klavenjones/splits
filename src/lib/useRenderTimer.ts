import { useCallback, useRef, useState } from 'react';

/**
 * Development only: logs how long a view took from its first render to its first chart on
 * screen ("[progress] strength first chart 184 ms"). Call the returned function from the chart's
 * onReady; it logs once, a frame later (after Skia has drawn).
 */
export function useRenderTimer(label: string): () => void {
  const [start] = useState(() => performance.now());
  const done = useRef(false);
  return useCallback(() => {
    if (!__DEV__ || done.current) return;
    done.current = true;
    requestAnimationFrame(() =>
      console.log(`[progress] ${label} first chart ${Math.round(performance.now() - start)} ms`),
    );
  }, [label, start]);
}
