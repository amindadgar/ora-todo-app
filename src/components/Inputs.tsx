import { useRef, type ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from '../tokens/tokens';

export interface Seg { t: string; hl: boolean }
/**
 * Smart input: a transparent <input> over a mirrored layer that highlights what the parser understood
 * (date / time / amount). The mirror scrolls with the input; text direction is automatic per script.
 */
export function SmartInput({ id, value, onChange, placeholder, segments, listening, onMic, micLabel, onEnter }:
  { id: string; value: string; onChange: (v: string) => void; placeholder: string; segments: Seg[]; listening: boolean; onMic: () => void; micLabel: string; onEnter?: () => void }) {
  const mirror = useRef<HTMLDivElement>(null);
  return (
    <div className="smart">
      <div className="smart__box">
        <div ref={mirror} dir="auto" className="smart__mirror" aria-hidden="true">
          {segments.map((g, i) => <span key={i} className={g.hl ? 'smart__hl' : ''}>{g.t}</span>)}
        </div>
        <input id={id} type="text" value={value} dir="auto" placeholder={placeholder} autoComplete="off" enterKeyHint="done"
          onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onEnter?.(); }}
          onScroll={(e) => { if (mirror.current) mirror.current.scrollLeft = e.currentTarget.scrollLeft; }} className="smart__input" />
      </div>
      <button type="button" className={`smart__mic${listening ? ' is-on' : ''}`} aria-label={micLabel} aria-pressed={listening} onClick={onMic}><Icon name="mic" size={20} /></button>
    </div>
  );
}
/** Detection card — the "here's what I got" summary. */
export function DetectionCard({ type, how, title, rows, children, empty }: { type: string; how: string; title: string; rows: { icon: IconName; text: string; sub: string }[]; children?: ReactNode; empty?: string }) {
  return (
    <section className="o-card detect" aria-live="polite">
      {empty ? <span className="t-small muted" style={{ lineHeight: 1.8 }}>{empty}</span> : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-8)' }}>
            <span className="t-overline detect__type">{type}</span><span className="t-overline muted" style={{ fontWeight: 400, letterSpacing: 0 }}>{how}</span>
          </div>
          <span className="t-subheading" style={{ lineHeight: 1.5 }}>{title}</span>
          {rows.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-10)' }}>
              <Icon name={r.icon} size={18} className="brand" /><div style={{ display: 'flex', flexDirection: 'column' }}><span className="t-label" style={{ fontWeight: 400 }}>{r.text}</span>{r.sub && <span className="t-overline muted" style={{ fontWeight: 400, letterSpacing: 0 }}>{r.sub}</span>}</div>
            </div>
          ))}
          {children}
        </>
      )}
    </section>
  );
}
/** Type tile — one choice in the "wrong type? change it" grid. */
export function TypeTile({ icon, label, selected, onClick }: { icon: IconName; label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={selected} className="typetile" onClick={onClick}>
      <Icon name={icon} size={22} /><span className="t-overline" style={{ letterSpacing: 0, lineHeight: 1.3, textAlign: 'center' }}>{label}</span>
    </button>
  );
}
/** Small pill option (e.g. "5 am / 5 pm"). */
export function PillOption({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" role="radio" aria-checked={selected} className="pillopt t-caption" onClick={onClick}>{children}</button>;
}
/** Plain text field (Edit sheet). */
export function TextField({ id, label, value, onChange, onEnter }: { id: string; label: string; value: string; onChange: (v: string) => void; onEnter?: () => void }) {
  return (<><label htmlFor={id} className="t-caption muted">{label}</label><input id={id} className="field" dir="auto" value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onEnter?.(); }} /></>);
}
