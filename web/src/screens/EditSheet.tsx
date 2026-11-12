import { useState } from 'react';
import { useData } from '../data/store';
import { useUI, type EditKind } from '../data/ui';
import { useI18n } from '../i18n';
import { Sheet } from '../components/Feedback';
import { TextField } from '../components/Inputs';
import { Button } from '../components/Buttons';
import { Segment } from '../components/Selection';
import { remindOptions } from '../components/NotifyRows';
import { removeFrom, shiftOneDay, updateIn, setDone } from '../data/actions';
import type { Item } from '../data/types';

interface Any { id: string; title: import('../i18n/dict').LText; day?: number; time?: string; amount?: number; remind?: number; cat?: keyof import('../i18n/dict').Dict['cats']; target?: number; have?: number; done?: boolean; type?: Item['type'] }

/** Edit sheet for any entry kind: title, status, one-day-later, delete (with Undo toast). */
export function EditSheet({ kind, id }: { kind: EditKind; id: string }) {
  const f = useI18n(); const { t, N, SEP, text } = f; const ui = useUI(); const data = useData();
  const item = (data[kind] as Any[]).find((x) => x.id === id);
  const [draft, setDraft] = useState(item ? text(item.title) : '');
  if (!item) { return null; }
  const heading = kind === 'items' ? t.edits[item.type as 'task'] ?? t.edits.items : t.edits[kind];
  const when = [item.day != null ? f.fullLabel(item.day) : '', item.time ? f.time(item.time) : '', item.amount ? f.money(item.amount) : '', item.cat ? t.cats[item.cat] : '',
    item.target ? N(item.have || 0) + t.of + (kind === 'savings' ? f.money(item.target) : N(item.target)) : ''].filter(Boolean).join(SEP);
  const canToggle = kind === 'items' && (item.type === 'task' || item.type === 'event'); const canShift = item.day != null && (kind === 'items' || kind === 'events' || kind === 'bills');
  const save = () => { const d = draft.trim(); if (d) updateIn(kind, id, { title: d }); ui.closeEdit(); };
  return (
    <Sheet title={heading} titleId="ed-h" closeLabel={t.close} onClose={ui.closeEdit} initialFocus="#ed-in">
      <TextField id="ed-in" label={t.titleLabel} value={draft} onChange={setDraft} onEnter={save} />
      <span className="t-caption muted">{when}</span>
      {kind === 'items' && item.time && (item.type === 'task' || item.type === 'event' || item.type === 'reminder') && (
        <div className="stack" style={{ gap: 'var(--space-8)' }}>
          <span className="t-small" style={{ fontWeight: 600 }}>{t.remindLabel}</span>
          <Segment label={t.remindLabel} value={String(item.remind ?? 0)} options={remindOptions(t, N)} onChange={(v) => updateIn(kind, id, { remind: +v || undefined } as never)} />
        </div>
      )}
      <div className="actions-row">
        {canToggle && <Button variant="secondary" onClick={() => { setDone(id, !item.done); ui.closeEdit(); }}>{item.done ? t.notDone : t.done}</Button>}
        {canShift && <Button variant="secondary" onClick={() => { ui.closeEdit(); shiftOneDay(kind as 'items', id); }}>{t.oneDayLater}</Button>}
        <Button variant="danger" onClick={() => { ui.closeEdit(); removeFrom(kind, id); }}>{t.delete}</Button>
      </div>
      <Button size="lg" onClick={save}>{t.saveChanges}</Button>
    </Sheet>
  );
}
