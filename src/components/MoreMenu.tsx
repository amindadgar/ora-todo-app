import { useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { IconButton } from './Buttons';
import type { IconName } from '../tokens/tokens';

/** "More" drawer (phones/tablets): slides from the inline-start edge, scrim closes it. */
export function MoreMenu({ title, items, closeLabel, onClose }: { title: string; items: { label: string; desc: string; icon: IconName; go: () => void }[]; closeLabel: string; onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { ref.current?.querySelector<HTMLElement>('button')?.focus(); }, []);
  return (
    <div className="more-root" onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <aside ref={ref} role="dialog" aria-modal="true" aria-labelledby="more-h" className="more">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 var(--space-8) var(--space-12)' }}>
          <h2 id="more-h" className="t-heading">{title}</h2>
          <IconButton icon="close" kind="muted" label={closeLabel} onClick={onClose} style={{ border: 'none', background: 'transparent' }} />
        </div>
        {items.map((s) => (
          <button key={s.label} type="button" className="more__item" onClick={s.go}>
            <Icon name={s.icon} size={22} className="brand" />
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}><span className="t-body" style={{ fontWeight: 400 }}>{s.label}</span><span className="t-overline muted" style={{ fontWeight: 400, letterSpacing: 0 }}>{s.desc}</span></span>
          </button>
        ))}
      </aside>
      <button type="button" className="more__scrim" aria-label={closeLabel} onClick={onClose} />
    </div>
  );
}
