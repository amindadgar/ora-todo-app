import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { Checkbox } from './Selection';
import { IconButton } from './Buttons';
import { useSwipeRow } from '../interactions/useSwipeRow';
import type { IconName } from '../tokens/tokens';

export interface MenuAction { id: string; label: string; icon?: IconName; danger?: boolean; run: () => void }

/** Popover menu used for ⋯ buttons and right-click on desktop. Esc / outside click / arrows. */
export function ActionMenu({ actions, at, onClose }: { actions: MenuAction[]; at: { x: number; y: number }; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const first = ref.current?.querySelector<HTMLElement>('[role=menuitem]'); first?.focus();
    const down = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const items = [...(ref.current?.querySelectorAll<HTMLElement>('[role=menuitem]') || [])]; const i = items.indexOf(document.activeElement as HTMLElement);
        items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus(); e.preventDefault();
      }
    };
    document.addEventListener('mousedown', down, true); document.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('mousedown', down, true); document.removeEventListener('keydown', key, true); };
  }, [onClose]);
  const rtl = document.documentElement.dir === 'rtl';
  const style: React.CSSProperties = { top: at.y, [rtl ? 'right' : 'left']: rtl ? window.innerWidth - at.x : at.x, position: 'fixed' };
  return (
    <div ref={ref} role="menu" className="menu" style={style}>
      {actions.map((a) => (
        <button key={a.id} role="menuitem" type="button" className={`menu__item${a.danger ? ' menu__item--danger' : ''}`} onClick={() => { onClose(); a.run(); }}>
          {a.icon && <Icon name={a.icon} size={18} />}{a.label}
        </button>
      ))}
    </div>
  );
}

/** State + trigger helpers for a ⋯ button / context menu. */
export function useActionMenu() {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const openAtButton = (el: HTMLElement) => { const r = el.getBoundingClientRect(); const rtl = document.documentElement.dir === 'rtl'; setMenu({ x: rtl ? r.right : r.left, y: r.bottom + 4 }); };
  return { menu, close: () => setMenu(null), openAt: (x: number, y: number) => setMenu({ x, y }), openAtButton };
}

/** Task row — Checkbox + title/meta + Urgent tag. Swipe/long-press on touch; ⋯ + right-click on desktop. */
export function TaskRow({ title, meta, urgent, done, pending, actions, labels, onToggle, onEdit, onDelete }:
  { title: string; meta: string; urgent?: boolean; done?: boolean; pending?: boolean; actions: MenuAction[]; labels: { done: string; del: string; urgent: string; more: string; toggle: string }; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const am = useActionMenu();
  const sw = useSwipeRow({ onDone: onToggle, onDelete, onLongPress: onEdit, onContext: (e) => am.openAt(e.clientX, e.clientY) });
  const cls = `taskrow${done ? ' taskrow--done' : ''}${pending ? ' taskrow--pending' : ''}`;
  if (done) {
    return (
      <div className={cls}><div className="taskrow__fg">
        <Checkbox state="on" label={labels.toggle} onClick={onToggle} />
        <button type="button" className="taskrow__main" onClick={onEdit}><span className="taskrow__title">{title}</span></button>
      </div></div>
    );
  }
  const op = Math.min(1, Math.abs(sw.dx) / 40);
  return (
    <div className={cls}>
      <div className="taskrow__under" aria-hidden="true" style={{ background: sw.dx > 0 ? 'var(--c-status-success)' : sw.dx < 0 ? 'var(--c-status-danger)' : 'transparent', opacity: op }}>
        <span style={{ display: 'flex', gap: 6, transform: `scale(${sw.dx > 88 ? 1.12 : 1})`, transition: 'transform .15s' }}>{sw.dx > 0 ? '✓ ' + labels.done : ''}</span>
        <span style={{ display: 'flex', gap: 6, transform: `scale(${sw.dx < -88 ? 1.12 : 1})`, transition: 'transform .15s' }}>{sw.dx < 0 ? labels.del : ''}</span>
      </div>
      <div className="taskrow__fg" {...sw.bind}
        style={{ transform: `translateX(${sw.dx}px)`, transition: sw.animate ? 'transform .22s var(--ease-out)' : 'none', background: sw.dx !== 0 ? 'var(--c-bg-surface)' : 'transparent' }}>
        <Checkbox state={pending ? 'pending' : 'off'} label={labels.toggle} onClick={() => { if (!sw.suppressed()) onToggle(); }} />
        <button type="button" className="taskrow__main" onClick={() => { if (!sw.suppressed()) onEdit(); }}>
          <span className="taskrow__title">{title}</span>
          {meta && <span className="taskrow__meta">{meta}</span>}
        </button>
        {urgent && <span className="tag-urgent">{labels.urgent}</span>}
        <span className="taskrow__more"><IconButton icon="more2" kind="muted" label={labels.more} aria-haspopup="menu" onClick={(e) => am.openAtButton(e.currentTarget)} /></span>
      </div>
      {am.menu && <ActionMenu actions={actions} at={am.menu} onClose={am.close} />}
    </div>
  );
}

/** Simple agenda / reminder line. */
export function AgendaRow({ title, time, color, onClick }: { title: string; time: string; color?: string; onClick?: () => void }) {
  const body = <span className="t-label" style={{ fontWeight: 400, color: color || 'var(--c-text-primary)', flex: 1, textAlign: 'start' }}>{title}</span>;
  return (
    <div className="row" style={{ minHeight: 48 }}>
      {onClick ? <button type="button" onClick={onClick} style={{ flex: 1, minHeight: 48, display: 'flex', alignItems: 'center' }}>{body}</button> : body}
      <span className="t-small muted tnum">{time}</span>
    </div>
  );
}
export const ReminderRow = ({ when, title, onClick }: { when: string; title: string; onClick: () => void }) => (
  <button type="button" onClick={onClick} className="t-caption muted" style={{ minHeight: 32, display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
    <span style={{ fontWeight: 600, minWidth: 52 }}>{when}</span><span>{title}</span>
  </button>
);
export const ListCard = ({ children, pad = true }: { children: ReactNode; pad?: boolean }) => <div className={`o-card${pad ? ' list' : ''}`}>{children}</div>;
