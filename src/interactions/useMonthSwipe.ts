import { useRef, useState } from 'react';
import type { PointerEvent as RP } from 'react';
import { buzz } from './haptics';

/** Horizontal swipe between months (50px threshold, 0.45 drag follow) — from the prototype. `next(dx)` decides direction (RTL aware). */
export function useMonthSwipe(onStep: (step: 1 | -1) => void, rtl: boolean) {
  const [dx, setDx] = useState(0); const [drag, setDrag] = useState(false);
  const s = useRef<{ x0: number; y0: number; lock: null | 'x'; dx: number; pid: number; el: HTMLElement } | null>(null); const suppress = useRef(false);
  return {
    dx, drag, suppressed: () => suppress.current,
    bind: {
      onPointerDown: (e: RP<HTMLElement>) => { if (e.button != null && e.button !== 0) return; if (e.pointerType === 'mouse') return; s.current = { x0: e.clientX, y0: e.clientY, lock: null, dx: 0, pid: e.pointerId, el: e.currentTarget }; },
      onPointerMove: (e: RP<HTMLElement>) => {
        const d = s.current; if (!d) return; const mx = e.clientX - d.x0, my = e.clientY - d.y0;
        if (!d.lock) { if (Math.abs(mx) > 10 && Math.abs(mx) > Math.abs(my) * 1.2) { d.lock = 'x'; try { d.el.setPointerCapture(d.pid); } catch { /* ignore */ } } else if (Math.abs(my) > 10) { s.current = null; return; } else return; }
        d.dx = mx; setDx(mx * 0.45); setDrag(true);
      },
      onPointerUp: () => {
        const d = s.current; s.current = null; if (!d || d.lock !== 'x') return;
        suppress.current = true; setTimeout(() => { suppress.current = false; }, 380);
        if (Math.abs(d.dx) > 50) { const nx = rtl ? d.dx > 0 : d.dx < 0; buzz(8); onStep(nx ? 1 : -1); }
        setDx(0); setDrag(false);
      },
      onPointerCancel: () => { s.current = null; setDx(0); setDrag(false); }
    }
  };
}
