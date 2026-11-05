import { Sheet } from './Feedback';
import type { Dict } from '../i18n/dict';

export function HelpDialog({ t, onClose }: { t: Dict; onClose: () => void }) {
  const rows: [string[], string][] = [[['N'], t.newTaskShortcut], [['T'], t.backToToday], [['←', '→', '↑', '↓'], t.calendar], [['PgUp', 'PgDn'], t.prevMonth + ' / ' + t.nextMonth], [['Esc'], t.close], [['?'], t.shortcuts]];
  return (
    <Sheet title={t.shortcuts} titleId="help-h" closeLabel={t.close} onClose={onClose}>
      <div role="list">{rows.map(([keys, label]) => (
        <div key={label} role="listitem" className="row" style={{ padding: 'var(--space-10) 0', justifyContent: 'space-between' }}>
          <span className="t-label" style={{ fontWeight: 400 }}>{label}</span><span style={{ display: 'flex', gap: 'var(--space-4)' }}>{keys.map((k) => <kbd key={k} style={{ display: 'inline-block' }}>{k}</kbd>)}</span>
        </div>
      ))}</div>
    </Sheet>
  );
}
