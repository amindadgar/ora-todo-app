import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as RPointerEvent, MouseEvent as RMouseEvent } from 'react';
import { buzz } from './haptics';
import { motion } from '../tokens/tokens';

/**
 * Swipe-to-complete (→) / swipe-to-delete (←) + long-press-to-edit, ported from the prototype
 * (threshold 88px, rubber-band after 150px, long-press 480ms, vertical drags cancel).
 * Works with touch AND mouse pointer events; desktop users also get the ⋯ menu / context menu.
 */
export function useSwipeRow({ onDone, onDelete, onLongPress, onContext }: { onDone: () => void; onDelete: () => void; onLongPress: () => void; onContext?: (e: RMouseEvent) => void }) {
  const [dx, setDx] = useState(0); const [animate, setAnimate] = useState(true);
  const d = useRef<{ x0: number; y0: number; lock: null | 'x' | 'y'; dx: number; pid: number; el: HTMLElement; past: boolean; type: string } | null>(null);
  const lp = useRef<ReturnType<typeof setTimeout>>(); const suppress = useRef(false); const supT = useRef<ReturnType<typeof setTimeout>>();
  const cb = useRef({ onDone, onDelete, onLongPress, onContext }); cb.current = { onDone, onDelete, onLongPress, onContext };
  const TH = motion.swipeThreshold;
  const clearLP = () => { clearTimeout(lp.current); lp.current = undefined; };
  const doSuppress = () => { suppress.current = true; clearTimeout(supT.current); supT.current = setTimeout(() => { suppress.current = false; }, 380); };
  useEffect(() => () => { clearLP(); clearTimeout(supT.current); }, []);

  const onPointerDown = useCallback((e: RPointerEvent<HTMLElement>) => {
    if (e.button != null && e.button !== 0) return;
    d.current = { x0: e.clientX, y0: e.clientY, lock: null, dx: 0, pid: e.pointerId, el: e.currentTarget, past: false, type: e.pointerType };
    clearLP();
    lp.current = setTimeout(() => { const s = d.current; if (!s || s.lock) return; d.current = null; doSuppress(); buzz(20); cb.current.onLongPress(); }, motion.longPress);
  }, []);
  const onPointerMove = useCallback((e: RPointerEvent<HTMLElement>) => {
    const s = d.current; if (!s) return;
    const mx = e.clientX - s.x0, my = e.clientY - s.y0;
    if (!s.lock) {
      if (Math.abs(mx) > 8 && Math.abs(mx) > Math.abs(my) * 1.2) { s.lock = 'x'; clearLP(); try { s.el.setPointerCapture(s.pid); } catch { /* ignore */ } }
      else if (Math.abs(my) > 8) { s.lock = 'y'; clearLP(); d.current = null; return; }
      else return;
    }
    const v = Math.abs(mx) > 150 ? (mx > 0 ? 1 : -1) * (150 + (Math.abs(mx) - 150) * 0.35) : mx;
    s.dx = v; const past = Math.abs(v) > TH; if (past !== s.past) { s.past = past; if (past) buzz(8); }
    setAnimate(false); setDx(v);
  }, [TH]);
  const settle = useCallback(() => {
    const s = d.current; d.current = null; clearLP();
    if (!s || s.lock !== 'x') return;
    doSuppress(); setAnimate(true);
    if (s.dx > TH) { setDx(400); setTimeout(() => { cb.current.onDone(); setDx(0); }, 200); }
    else if (s.dx < -TH) { buzz(18); setDx(-400); setTimeout(() => { cb.current.onDelete(); setDx(0); }, 200); }
    else setDx(0);
  }, [TH]);
  const onPointerCancel = useCallback(() => { const s = d.current; clearLP(); d.current = null; if (s?.lock === 'x') { setAnimate(true); setDx(0); } }, []);
  const onContextMenu = useCallback((e: RMouseEvent) => {
    e.preventDefault();
    if ((e.nativeEvent as PointerEvent).pointerType === 'touch') return;
    cb.current.onContext?.(e);
  }, []);
  return { dx, animate, suppressed: () => suppress.current, bind: { onPointerDown, onPointerMove, onPointerUp: settle, onPointerCancel, onContextMenu } };
}
