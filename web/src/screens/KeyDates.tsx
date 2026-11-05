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
  return (
    <main aria-label={t.keyDates} className="narrow">
      <PageHeader title={t.keyDates} onBack={nav.back} backLabel={t.back} />
      <div className="screen screen--flush" style={{ gap: 'var(--space-12)' }}>
        {events.length === 0 && <p className="t-small muted" style={{ lineHeight: 1.8 }}>{t.emptyEvents}</p>}
        {events.length > 0 && (
          <ListCard>{sorted.map((e) => { const d = e.day - T; return (
            <ValueRow key={e.id} strong titleSize="body" title={f.text(e.title)} sub={f.shortDate(e.day) + SEP + (e.yearly ? t.yearly : t.once)}
              value={d === 0 ? t.today : d < 0 ? f.shortDate(e.day) : t.inDays(f.N(d))} valueClass={d >= 0 && d <= 14 ? 'brand' : 'muted'}
              onClick={() => ui.openEdit('events', e.id)} actions={rowActions(t, 'events', e.id, ui.openEdit, true)} moreLabel={t.more_} />
          ); })}</ListCard>
        )}
        <TextButton style={{ alignSelf: 'flex-start' }} onClick={() => ui.openAdd({ type: 'important' })}>{t.addEvent}</TextButton>
      </div>
    </main>
  );
}
