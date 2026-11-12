import { useData } from '../data/store';
import { useUI } from '../data/ui';
import { useNav } from '../data/nav';
import { useI18n } from '../i18n';
import { today } from '../lib/calendar';
import { PageHeader } from '../components/Navigation';
import { ValueRow } from '../components/Money';
import { ListCard } from '../components/Lists';
import { TextButton } from '../components/Buttons';
import { rowActions } from './common';

export function KeyDatesScreen() {
  const f = useI18n(); const { t, SEP } = f; const ui = useUI(); const nav = useNav(); const events = useData((s) => s.events); const T = today();
  const sorted = [...events].sort((a, b) => a.day - b.day);
  const upcoming = sorted.filter((e) => e.day >= T); const next = upcoming[0];
  const month = (e: { day: number }) => e.day - T <= 30;
  const groups = [[t.keyThisMonth, sorted.filter((e) => e.day < T || month(e))], [t.keyLater, sorted.filter((e) => e.day >= T && !month(e))]] as const;
  const rowOf = (e: typeof sorted[number]) => { const d = e.day - T; return (
    <ValueRow key={e.id} strong titleSize="body" title={f.text(e.title)} sub={f.shortDate(e.day) + SEP + (e.yearly ? t.yearly : t.once)}
      value={d === 0 ? t.today : d < 0 ? f.shortDate(e.day) : t.inDays(f.N(d))} valueClass={d >= 0 && d <= 14 ? 'brand' : 'muted'}
      onClick={() => ui.openEdit('events', e.id)} actions={rowActions(t, 'events', e.id, ui.openEdit, true)} moreLabel={t.more_} />
  ); };
  return (
    <main aria-label={t.keyDates} className="narrow">
      <PageHeader title={t.keyDates} onBack={nav.back} backLabel={t.back} />
      <div className="screen screen--flush" style={{ gap: 'var(--space-12)' }}>
        {events.length === 0 && <p className="t-small muted" style={{ lineHeight: 1.8 }}>{t.emptyEvents}</p>}
        {next && (
          <div className="o-soft" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-16)', padding: 'var(--space-16)', background: 'var(--c-brand-primary)', color: 'var(--c-text-on-brand)', border: 'none' }} data-testid="next-keydate">
            <span style={{ fontSize: 40, fontWeight: 700, lineHeight: 1 }}>{f.N(next.day - T)}</span>
            <span className="t-body" style={{ fontWeight: 600, lineHeight: 1.6 }}>{t.daysTo(f.N(next.day - T), f.text(next.title)).replace(/^\S+\s/, '')}</span>
          </div>
        )}
        {groups.map(([label, list]) => list.length > 0 && (
          <div key={label} className="stack" style={{ gap: 'var(--space-8)' }}>
            <h2 className="t-caption muted" style={{ fontWeight: 700, padding: '0 var(--space-4)' }}>{label}</h2>
            <ListCard>{list.map(rowOf)}</ListCard>
          </div>
        ))}
        <TextButton style={{ alignSelf: 'flex-start' }} onClick={() => ui.openAdd({ type: 'important' })}>{t.addEvent}</TextButton>
      </div>
    </main>
  );
}
