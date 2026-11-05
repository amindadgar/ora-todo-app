import { useRef, useState } from 'react';
import type { PointerEvent as RP } from 'react';
import { motion } from '../tokens/tokens';

/** Drag-down-to-dismiss for bottom sheets (110px threshold, 15% resistance upwards) — from the prototype. */
export function useSheetDrag(onClose: () => void) {
  const [y, setY] = useState(0); const [anim, setAnim] = useState(true); const s = useRef<{ y0: number; y: number } | null>(null);
  return {
    y, dim: Math.max(0, 0.4 * (1 - y / 360)).toFixed(3),
    transition: !anim && s.current ? 'none' : `transform ${motion.sheet}ms ${motion.easeOut}, background-color ${motion.sheet}ms`,
    bind: {
      onPointerDown: (e: RP<HTMLElement>) => { s.current = { y0: e.clientY, y: 0 }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } },
      onPointerMove: (e: RP<HTMLElement>) => { const d = s.current; if (!d) return; let v = e.clientY - d.y0; v = v < 0 ? v * 0.15 : v; d.y = v; setAnim(false); setY(v); },
      onPointerUp: () => { const d = s.current; s.current = null; if (!d) return; setAnim(true); if (d.y > motion.sheetDismiss) { setY(700); setTimeout(() => { setY(0); onClose(); }, 200); } else setY(0); },
      onPointerCancel: () => { s.current = null; setAnim(true); setY(0); }
    }
  };
}
