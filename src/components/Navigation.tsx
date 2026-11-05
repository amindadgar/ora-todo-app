import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { Logo } from './Brand';
import { IconButton, Button } from './Buttons';
import type { IconName } from '../tokens/tokens';
import type { Screen } from '../data/ui';

export interface NavDef { id: 'home' | 'calendar' | 'add' | 'money' | 'more'; label: string; icon: IconName }

/** Bottom tab bar (phones + tablets). Active tab shows a dot; "Add" is the centre action. */
export function TabBar({ items, active, bumped, onSelect, label }: { items: NavDef[]; active: string; bumped?: string | null; onSelect: (id: NavDef['id']) => void; label: string }) {
  return (
    <nav className="tabbar" aria-label={label}>
      {items.map((b) => {
        const act = b.id === active && b.id !== 'add';
        return (
          <button key={b.id} type="button" onClick={() => onSelect(b.id)} data-nav={b.id}
            aria-current={act && b.id !== 'more' ? 'page' : undefined}
            aria-expanded={b.id === 'more' ? act : undefined}
            className={`navitem${b.id === 'add' ? ' navitem--add' : ''}${bumped === b.id ? ' navitem--bump' : ''}`}
            style={act ? { color: 'var(--c-brand-primary)' } : undefined}>
            <Icon name={b.icon} size={b.id === 'add' ? 28 : 24} />
            {b.label}
            <span className="navitem__dot" style={act && b.id === 'more' ? { background: 'transparent' } : undefined} />
          </button>
        );
      })}
    </nav>
  );
}

export interface SideItem { id: Screen; label: string; icon: IconName; kbd?: string }
/** Desktop sidebar — mirrors automatically in RTL (inline-start edge). */
export function SideNav({ primary, secondary, active, onSelect, onAdd, addLabel, label, footer }:
  { primary: SideItem[]; secondary: SideItem[]; active: Screen; onSelect: (s: Screen) => void; onAdd: () => void; addLabel: string; label: string; footer: ReactNode }) {
  const item = (i: SideItem) => (
    <button key={i.id} type="button" className="sidenav__item" aria-current={i.id === active ? 'page' : undefined} onClick={() => onSelect(i.id)}>
      <Icon name={i.icon} size={22} />{i.label}{i.kbd && <kbd className="kbd-hint">{i.kbd}</kbd>}
    </button>
  );
  return (
    <nav className="sidenav" aria-label={label}>
      <div className="sidenav__logo"><Logo size={32} /></div>
      <div style={{ padding: '0 var(--space-4) var(--space-16)' }}><Button block size="lg" icon="plus" onClick={onAdd}>{addLabel}<kbd className="kbd-hint" style={{ background: 'transparent', color: 'inherit', borderColor: 'currentColor', opacity: .8 }}>N</kbd></Button></div>
      {primary.map(item)}
      <div className="sidenav__sep" role="separator" />
      {secondary.map(item)}
      <div className="sidenav__foot">{footer}</div>
    </nav>
  );
}

/** Page header with optional back button (More sub-screens). */
export function PageHeader({ title, onBack, backLabel }: { title: string; onBack?: () => void; backLabel?: string }) {
  return (
    <header className="page-head">
      {onBack && <IconButton icon="chevron-left" kind="plain" size={22} label={backLabel || ''} onClick={onBack} style={{ border: 'none', background: 'transparent' }} />}
      <h1 className="t-heading">{title}</h1>
    </header>
  );
}
