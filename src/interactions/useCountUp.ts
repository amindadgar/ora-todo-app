import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from './haptics';
import { motion } from '../tokens/tokens';

/**
 * Count-up / grow-in animation (1100ms, cubic-out) re-armed whenever `key` changes.
 * k(i) is the eased 0..1 progress for the i-th item (staggered by 0.05, like the prototype).
 */
export function useCountUp(key: string) {
  const [t, setT] = useState(0); const [run, setRun] = useState<string | null>(null); const raf = useRef(0);
  useEffect(() => {
    cancelAnimationFrame(raf.current);
    if (prefersReducedMotion()) { setT(1); setRun(null); return; }
    let t0: number | null = null; setT(0); setRun(key);
    const step = (now: number) => { if (t0 == null) t0 = now; const v = Math.min(1, (now - t0) / motion.countUp); setT(v); if (v < 1) raf.current = requestAnimationFrame(step); else setRun(null); };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [key]);
  const ease = (x: number) => { x = Math.max(0, Math.min(1, x)); return 1 - Math.pow(1 - x, 3); };
  return { animating: run !== null && t < 1, k: (i = 0) => (t >= 1 ? 1 : ease(t * 1.35 - i * 0.05)) };
}
