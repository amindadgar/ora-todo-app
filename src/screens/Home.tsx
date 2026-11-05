import { useMemo, useState } from 'react';
import { useData } from '../data/store';
import { useUI } from '../data/ui';
import { useCal } from '../data/calState';
import { useI18n } from '../i18n';
import { today, weekStart, weekdayIndex, toJ, toG, monthOffset, monthAt, isFriday, type CalMode } from '../lib/calendar';
import { nextFreeSlot, toHM } from '../lib/suggest';
import { setDone, removeFrom, addSuggestion, shiftOneDay } from '../data/actions';
import { Logo } from '../components/Brand';
import { HeaderActions } from '../components/HeaderActions';
import { WeekDay, CalendarDay } from '../components/Calendar';
import { Card, FreeTimeCard } from '../components/Cards';
import { ProgressBar } from '../components/Progress';
import { TaskRow, ReminderRow } from '../components/Lists';
import { TextButton, IconButton } from '../components/Buttons';
import { Icon } from '../components/Icon';
import { buzz } from '../interactions/haptics';
import { motion } from '../tokens/tokens';
import type { Item } from '../data/types';

export function useCalMode(): CalMode { const m = useData((s) => s.settings.calMode); const lang = useData((s) => s.settings.lang); return m ?? (lang === 'fa' ? 'j' : 'g'); }

export function Home({ go }: { go: (s: 'calendar' | 'wishlist') => void }) {
  const f = useI18n(); const { t, N, L, text, SEP } = f;
  const { items, events, bills, wishes, settings } = useData();
  const ui = useUI(); const cal = useCal(); const mode = useCalMode();
  const T = today();
  const [pend, setPend] = useState<string | null>(null); const [sugIdx, setSugIdx] = useState(0);

  const todays = items.filter((x) => x.day === T && (x.type === 'task' || x.type === 'event'));
  const open = todays.filter((x) => !x.done).sort((a, b) => ((a.time || '99') < (b.time || '99') ? -1 : 1));
  const done = todays.filter((x) => x.done);
  const total = todays.length, cnt = done.length, left = total - cnt;
  const msg = total === 0 ? t.fresh : cnt === 0 ? t.start : left === 0 ? t.allDone : left <= 2 ? t.fewLeft(N(left)) : t.goodStart;

  const has = (d: number) => items.some((x) => x.day === d) || bills.some((x) => x.day === d) || events.some((x) => x.day === d);
  const ws = weekStart(T);
  const week = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const d = ws + i; return { d, wd: t.weekdaysShort[i], n: N(mode === 'j' ? toJ(d).jd : toG(d).gd), today: d === T, hol: i === 6 || !!f.holiday(d), has: has(d), label: f.fullLabel(d) };
  });
  const gotoDay = (d: number) => { cal.set({ day: d, off: monthOffset(mode, T, d), dir: 0 }); go('calendar'); };

  const now = new Date(); const nowMin = now.getHours() * 60 + now.getMinutes();
  const slot = useMemo(() => nextFreeSlot(items, T, Math.max(17 * 60, Math.ceil(nowMin / 30) * 30)), [items, T, nowMin]);
  const sw = wishes.length ? wishes[sugIdx % wishes.length] : null;
  const already = sw ? items.some((x) => x.day === T && text(x.title) === text(sw.title)) : false;

  const reminders = [
    ...items.filter((x) => x.type === 'reminder' && x.day >= T).sort((a, b) => a.day - b.day).slice(0, 3).map((x) => ({ id: x.id, kind: 'items' as const, title: text(x.title), when: x.day === T ? (x.time ? f.time(x.time) : t.today) : x.day === T + 1 ? t.tmrw : f.shortDate(x.day) })),
    ...events.filter((e) => e.day >= T && e.day - T <= 7).map((e) => ({ id: e.id, kind: 'events' as const, title: text(e.title), when: L(N(e.day - T) + ' روز', `${e.day - T} days`) as string }))
  ].slice(0, 4);

  const toggle = (x: Item) => {
    if (pend) return; if (x.done) { setDone(x.id, false); return; }
    buzz(10); setPend(x.id); setTimeout(() => { setPend(null); setDone(x.id, true, open.length); useData.getState().setSettings({ tipSeen: true }); }, motion.strike);
  };
  const del = (x: Item) => { removeFrom('items', x.id); useData.getState().setSettings({ tipSeen: true }); };
  const rowFor = (x: Item, isDone: boolean) => {
    const meta = [x.time ? f.time(x.time) : '', x.type === 'event' ? t.event : ''].filter(Boolean).join(SEP);
    return (
      <TaskRow key={x.id} title={text(x.title)} meta={meta} urgent={!!x.urgent && !x.done} done={isDone} pending={pend === x.id}
        labels={{ done: t.swipeDone, del: t.swipeDelete, urgent: t.urgent, more: t.more_, toggle: t.markDone }}
        actions={[
          { id: 'edit', label: t.edit, icon: 'edit', run: () => ui.openEdit('items', x.id) },
          { id: 'done', label: x.done ? t.notDone : t.done, icon: 'check', run: () => toggle(x) },
          { id: 'later', label: t.oneDayLater, icon: 'clock', run: () => shiftOneDay('items', x.id) },
          { id: 'del', label: t.delete, icon: 'trash', danger: true, run: () => del(x) }
        ]}
        onToggle={() => toggle(x)} onEdit={() => ui.openEdit('items', x.id)} onDelete={() => del(x)} />
    );
  };

  // mini month (desktop)
  const mm = monthAt(mode, T, 0), lead = weekdayIndex(mm.start);
  const todayLine = f.fullLabel(T) + SEP + (f.fa ? f.gLabel(T) : f.jLabel(T, true));
  return (
    <main className="screen home" aria-label={t.home}>
      <div className="home__head app-head">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div style={{ alignSelf: 'flex-start', marginBottom: 'var(--space-8)' }} className="home__logo"><Logo /></div>
          <h1 className="t-subheading" style={{ fontWeight: 600, lineHeight: 1.5 }}>{t.hello}</h1>
          <span className="t-small muted">{todayLine}</span>
        </div>
        <HeaderActions className="home__actions" />
      </div>

      <div role="list" aria-label={t.thisWeek} className="weekstrip home__week">
        {week.map((d) => <WeekDay key={d.d} wd={d.wd} n={d.n} today={d.today} holiday={d.hol} hasEvent={d.has} label={d.label} onClick={() => gotoDay(d.d)} />)}
      </div>

      <Card className="home__tasks" aria-labelledby="tasks-h">
        <div style={{ padding: 'var(--space-16) var(--space-16) var(--space-12)', display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }} className="o-divider">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-8)' }}>
            <h2 id="tasks-h" className="t-subheading">{t.tasksTitle}</h2>
            <span className="t-small muted" style={{ fontWeight: 600 }}>{t.doneCount(N(cnt), N(total))}</span>
          </div>
          <ProgressBar value={total ? Math.round((cnt / total) * 100) : 0} label={t.tasksTitle} />
          <span className="t-small on-soft">{msg}</span>
        </div>
        <div style={{ padding: 'var(--space-2) var(--space-8) var(--space-4)' }}>
          {total === 0 && <p className="t-small muted" style={{ padding: 'var(--space-16) var(--space-8) var(--space-4)', lineHeight: 1.8 }}>{t.emptyTasks}</p>}
          {!settings.tipSeen && open.length > 0 && (
            <div className="tip">
              <Icon name="hand" size={16} stroke={2} />
              <span className="t-caption" style={{ flex: 1, lineHeight: 1.6 }}><span className="tip__touch">{t.tip}</span><span className="tip__mouse">{t.tipDesktop}</span></span>
              <IconButton icon="close" size={14} kind="plain" label={t.close} style={{ width: 32, height: 32, color: 'var(--c-text-on-soft)' }} onClick={() => useData.getState().setSettings({ tipSeen: true })} />
            </div>
          )}
          {open.map((x) => rowFor(x, false))}
          {done.map((x) => rowFor(x, true))}
          <TextButton icon="plus" style={{ height: 48, paddingInline: 'var(--space-12)' }} onClick={() => ui.openAdd({ type: 'task', day: T })}>{t.addTask}</TextButton>
        </div>
      </Card>

      {sw && slot && (
        <div className="home__free">
          <FreeTimeCard slot={f.time(toHM(slot[0])) + L(' تا ', '–') + f.time(toHM(slot[1]))} title={text(sw.title)} meta={text(sw.meta)} added={already}
            labels={{ header: t.freeTitle, add: t.addToDay, inPlan: t.inYourPlan, another: t.another, all: t.allIdeas }}
            onAdd={() => addSuggestion(text(sw.title), slot[0], T)} onNext={() => setSugIdx(sugIdx + 1)} onAll={() => go('wishlist')} />
        </div>
      )}

      <Card className="home__mini" aria-label={t.calendar}>
        <div style={{ padding: 'var(--space-16)', display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 className="t-subheading">{mode === 'j' ? t.jMonths[mm.month - 1] : t.gMonths[mm.month - 1]} {N(mm.year)}</h2>
            <TextButton small onClick={() => gotoDay(T)}>{t.calendar}</TextButton>
          </div>
          <div className="cal-wd">{t.weekdaysShort.map((w, i) => <span key={i} className={i === 6 ? 'is-fri' : ''}>{w}</span>)}</div>
          <div className="cal-grid mini-grid">
            {Array.from({ length: lead }, (_, i) => <span key={'e' + i} />)}
            {Array.from({ length: mm.length }, (_, i) => { const d = mm.start + i; return (
              <CalendarDay key={d} n={N(i + 1)} selected={false} today={d === T} red={isFriday(d) || !!f.holiday(d)} hasEvent={has(d)} label={f.fullLabel(d)} onClick={() => gotoDay(d)} />
            ); })}
          </div>
        </div>
      </Card>

      {reminders.length > 0 && (
        <section className="home__rem" aria-labelledby="rem-h" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: '0 var(--space-4)' }}>
          <h2 id="rem-h" className="t-caption muted" style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>{t.remTitle}</h2>
          {reminders.map((r) => <ReminderRow key={r.kind + r.id} when={r.when} title={r.title} onClick={() => ui.openEdit(r.kind, r.id)} />)}
        </section>
      )}
    </main>
  );
}
