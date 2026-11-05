import { useEffect, useRef, type ReactNode } from 'react';
import { IconButton } from './Buttons';
import { useSheetDrag } from '../interactions/useSheetDrag';

export function Toast({ msg, onUndo, onView, undoLabel, viewLabel }: { msg: string; onUndo?: () => void; onView?: () => void; undoLabel: string; viewLabel: string }) {
  return (
    <div className="toast" role="status">
      <span className="toast__msg">{msg}</span>
      {onView && <button type="button" className="toast__act" onClick={onView}>{viewLabel}</button>}
      {onUndo && <button type="button" className="toast__act" onClick={onUndo}>{undoLabel}</button>}
    </div>
  );
}

const FOCUSABLE = 'button:not([disabled]),input,[href],[tabindex]:not([tabindex="-1"])';
/**
 * Sheet: bottom sheet on phones (drag down to dismiss), centred dialog from 768px up.
 * Esc closes, focus is trapped and restored.
 */
export function Sheet({ title, titleId, closeLabel, onClose, children, footer, initialFocus }: { title: string; titleId: string; closeLabel: string; onClose: () => void; children: ReactNode; footer?: ReactNode; initialFocus?: string }) {
  const drag = useSheetDrag(onClose); const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => { (initialFocus ? ref.current?.querySelector<HTMLElement>(initialFocus) : null)?.focus(); }, 60);
    return () => { clearTimeout(t); prev?.focus?.(); };
  }, [initialFocus]);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
    if (e.key === 'Tab') {
      const f = [...(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) || [])].filter((x) => x.offsetParent !== null);
      if (!f.length) return; const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  return (
    <div className="sheet-root" style={{ ['--dim' as string]: drag.dim }}>
      <div className="sheet-backdrop" onClick={onClose} style={{ transition: drag.transition }} />
      <section ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className="sheet" onKeyDown={onKey}
        style={{ transform: `translateY(${drag.y}px)`, transition: drag.transition }}>
        <div className="sheet__grab" {...drag.bind}><span /></div>
        <div className="sheet__head"><h2 id={titleId} className="t-subheading">{title}</h2><IconButton icon="close" kind="muted" label={closeLabel} onClick={onClose} style={{ border: 'none', background: 'transparent' }} /></div>
        <div className="sheet__body">{children}</div>
        {footer && <div className="sheet__foot">{footer}</div>}
      </section>
    </div>
  );
}

const CONF = ['var(--c-brand-primary)', 'var(--c-status-success)', 'var(--p-amber-400)', 'var(--c-confetti-pink)', 'var(--p-blue-200)', 'var(--p-green-300)'];
/** Confetti burst (22 pieces, positions/timings from the prototype). */
export function Confetti() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 70 }} aria-hidden="true">
      {Array.from({ length: 22 }, (_, i) => {
        const r = ((i * 37) % 22) / 22;
        return <span key={i} style={{ position: 'absolute', top: -20 - (i % 4) * 14, left: `${4 + ((i * 41) % 92)}%`, width: 6 + (i % 3) * 2, height: i % 2 ? 10 : 6, borderRadius: i % 3 === 0 ? 4 : 1, background: CONF[i % CONF.length],
          animation: `${i % 2 ? 'rz-cf-a' : 'rz-cf-b'} ${(1.3 + r * 0.6).toFixed(2)}s ${(r * 0.35).toFixed(2)}s cubic-bezier(.25,.6,.35,1) both` }} />;
      })}
    </div>
  );
}
