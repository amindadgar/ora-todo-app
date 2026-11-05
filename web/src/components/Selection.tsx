import type { ReactNode } from 'react';
import { Icon } from './Icon';

/** Checkbox (circle) — state: off | pending (animating) | on */
export function Checkbox({ state, label, onClick }: { state: 'off' | 'pending' | 'on'; label: string; onClick: () => void }) {
  return (
    <button type="button" role="checkbox" aria-checked={state !== 'off'} aria-label={label} onClick={onClick}
      className={`checkbox checkbox--${state}`} style={state === 'on' ? { height: 44 } : undefined}>
      <span className="checkbox__ring">{state !== 'off' && <span style={{ animation: state === 'pending' ? 'rz-check .3s ease-out' : undefined, display: 'flex' }}><Icon name="check" size={13} stroke={3} /></span>}</span>
    </button>
  );
}
/** Toggle switch */
export function Toggle({ checked, onChange, labelledBy }: { checked: boolean; onChange: () => void; labelledBy: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-labelledby={labelledBy} onClick={onChange} className="toggle">
      <span className="toggle__track"><span className="toggle__thumb" /></span>
    </button>
  );
}
/** Segment — radiogroup of options (settings rows) */
export function Segment<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="segment">
      {options.map(([v, text]) => <button key={v} type="button" role="radio" aria-checked={v === value} className="segment__opt" onClick={() => onChange(v)}>{text}</button>)}
    </div>
  );
}
/** Tabs — underlined tab strip (calendar type, report range) */
export function Tabs<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div role="tablist" aria-label={label} className="tabs"
      onKeyDown={(e) => {
        const i = options.findIndex(([v]) => v === value); const dir = document.documentElement.dir === 'rtl' ? -1 : 1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const step = (e.key === 'ArrowRight' ? 1 : -1) * dir; onChange(options[(i + step + options.length) % options.length][0]); }
      }}>
      {options.map(([v, text]) => <button key={v} type="button" role="tab" aria-selected={v === value} tabIndex={v === value ? 0 : -1} className="tab" onClick={() => onChange(v)}>{text}</button>)}
    </div>
  );
}
export const Row = ({ children }: { children: ReactNode }) => <div className="row">{children}</div>;
