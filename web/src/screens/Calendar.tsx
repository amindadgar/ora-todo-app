import { useEffect, useRef } from 'react';
import { useMeetings } from '../data/meetings';
import { useData } from '../data/store';
import { useUI } from '../data/ui';
import { useCal } from '../data/calState';
import { useI18n } from '../i18n';
import { today, monthAt, monthOffset, weekdayIndex, toJ, toG, isFriday, type Day } from '../lib/calendar';
import { PageHeader } from '../components/Navigation';
import { Tabs } from '../components/Selection';
import { MonthHeader, CalendarDay } from '../components/Calendar';
import { AgendaRow } from '../components/Lists';
import { Button, TextButton } from '../components/Buttons';
import { useMonthSwipe } from '../interactions/useMonthSwipe';
import { useCalMode } from './Home';

export function CalendarScreen() {
  const f = useI18n(); const { t, N, text, SEP } = f; const ui = useUI();
  const { items, events, bills, settings } = useData(); const setSettings = useData((s) => s.setSettings);
  const mode = useCalMode(); const cal = useCal(); const T = today();
  const sel = cal.day ?? T; const off = cal.off; const rtl = f.dir === 'rtl';
  const m = monthAt(mode, T, off);
  const lead = weekdayIndex(m.start);
  const meetings = useMeetings((m) => m.list);
  const has = (d: Day) => items.some((x) => x.day === d) || meetings.some((x) => x.day === d) || bills.some((x) => x.day === d) || events.some((x) => x.day === d);
  const step = (n: 1 | -1) => cal.set({ off: off + n, dir: n });
  const swipe = useMonthSwipe(step, rtl);
  const gridRef = useRef<HTMLDivElement>(null);

  const title = (mode === 'j' ? t.jMonths[m.month - 1] : t.gMonths[m.month - 1]) + ' ' + N(m.year);
  const endD = m.start + m.length - 1;
  const sub = mode === 'j'
    ? `${t.gMonths[toG(m.start).gm - 1]} – ${t.gMonths[toG(endD).gm - 1]} ${N(toG(endD).gy)}`
    : `${t.jMonths[toJ(m.start).jm - 1]} – ${t.jMonths[toJ(endD).jm - 1]} ${N(toJ(endD).jy)}`;
  const holidays = Array.from({ length: m.length }, (_, i) => m.start + i).filter((d) => f.holiday(d)).map((d) => f.shortDate(d) + SEP + f.holiday(d));

  // select a day (and move the visible month if needed)
  const pick = (d: Day, focus = false) => {
    cal.set({ day: d, off: monthOffset(mode, T, d), dir: 0 });
    if (focus) requestAnimationFrame(() => gridRef.current?.querySelector<HTMLElement>(`[data-jdn="${d}"] button`)?.focus());
  };
  // keyboard: arrows move days (RTL-aware), PageUp/PageDown change month, T = today, Home/End = month edges
  const onGridKey = (e: React.KeyboardEvent) => {
    const h = rtl ? -1 : 1; let d = sel;
    switch (e.key) {
      case 'ArrowRight': d = sel + h; break; case 'ArrowLeft': d = sel - h; break;
      case 'ArrowDown': d = sel + 7; break; case 'ArrowUp': d = sel - 7; break;
      case 'Home': d = m.start; break; case 'End': d = endD; break;
      case 'PageDown': step(1); e.preventDefault(); return; case 'PageUp': step(-1); e.preventDefault(); return;
      default: return;
    }
    e.preventDefault(); pick(d, true);
  };
  // mouse wheel over the grid switches months (desktop), throttled
  useEffect(() => {
    const el = gridRef.current?.parentElement; if (!el) return; let last = 0;
    const w = (e: WheelEvent) => {
      if (!window.matchMedia('(hover:hover) and (min-width:768px)').matches || e.ctrlKey) return;
      if (Math.abs(e.deltaY) < 8 && Math.abs(e.deltaX) < 8) return; e.preventDefault();
      const now = Date.now(); if (now - last < 380) return; last = now; step((Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) > 0 ? 1 : -1);
    };
    el.addEventListener('wheel', w, { passive: false }); return () => el.removeEventListener('wheel', w);
  });

  const agenda: { key: string; title: string; time: string; color?: string; edit?: () => void }[] = [];
  const hol = f.holiday(sel); if (hol) agenda.push({ key: 'hol', title: hol, time: t.holiday, color: 'var(--c-status-danger)' });
  meetings.filter((x) => x.day === sel).forEach((x) => agenda.push({ key: 'g' + x.id, title: x.title || t.meeting, time: f.time(x.start) + '–' + f.time(x.end), color: 'var(--c-brand-primary)' }));
  events.filter((x) => x.day === sel).forEach((x) => agenda.push({ key: x.id, title: text(x.title), time: t.keyDate, edit: () => ui.openEdit('events', x.id) }));
  bills.filter((x) => x.day === sel).forEach((x) => agenda.push({ key: x.id, title: text(x.title) + SEP + f.money(x.amount), time: t.due, edit: () => ui.openEdit('bills', x.id) }));
  items.filter((x) => x.day === sel).forEach((x) => agenda.push({ key: x.id, title: text(x.title) + (x.amount ? SEP + f.money(x.amount) : ''), time: f.time(x.time), color: x.done ? 'var(--c-text-secondary)' : undefined, edit: () => ui.openEdit('items', x.id) }));

  const anim = cal.dir ? `${(cal.dir > 0) !== rtl ? 'rz-in-r' : 'rz-in-l'}${off % 2 ? '' : '2'} .28s var(--ease-out)` : 'none';
  return (
    <main className="cal" aria-label={t.calendar}>
      <div className="cal__head"><PageHeader title={t.calendar} /></div>
      <div className="screen screen--flush cal__main">
        <Tabs label={t.calType} value={mode} options={[['j', t.jalali], ['g', t.gregorian]]} onChange={(v) => { setSettings({ calMode: v }); cal.set({ off: 0, day: null }); }} />
        <MonthHeader title={title} sub={sub} prevLabel={t.prevMonth} nextLabel={t.nextMonth} onPrev={() => step(-1)} onNext={() => step(1)} />
        {off !== 0 && <Button variant="secondary" style={{ alignSelf: 'center', color: 'var(--c-brand-primary)' }} onClick={() => cal.set({ off: 0, dir: off > 0 ? -1 : 1, day: T })}>{t.backToToday}</Button>}
        <div {...swipe.bind} className="cal__grid-wrap" style={{ transform: `translateX(${swipe.dx}px)`, transition: swipe.drag ? 'none' : 'transform .25s var(--ease-out)' }}>
          <div className="cal-wd" aria-hidden="true">{t.weekdaysShort.map((w, i) => <span key={i} className={i === 6 ? 'is-fri' : ''}>{w}</span>)}</div>
          <div ref={gridRef} key={`${mode}${off}`} role="grid" aria-label={title} className="cal-grid cal-grid--big" style={{ animation: anim }} onKeyDown={onGridKey}>
            {Array.from({ length: lead }, (_, i) => <span key={'e' + i} />)}
            {Array.from({ length: m.length }, (_, i) => {
              const d = m.start + i, j = toJ(d), g = toG(d);
              return (
                <div key={d} data-jdn={d} role="gridcell" style={{ display: 'contents' }}>
                  <CalendarDay n={N(i + 1)} alt={settings.showAlt ? (mode === 'j' ? String(g.gd) : N(j.jd)) : undefined} selected={d === sel} today={d === T}
                    red={isFriday(d) || !!f.holiday(d)} hasEvent={has(d)} label={f.weekday(d) + ' ' + f.jLabel(d, true) + (f.holiday(d) ? SEP + f.holiday(d) : '')}
                    tabIndex={d === sel ? 0 : -1} onClick={() => { if (!swipe.suppressed()) pick(d); }} />
                </div>
              );
            })}
          </div>
        </div>
        {holidays.map((h, i) => <span key={i} className="t-caption danger">{h}</span>)}
        <details className="holidaynote"><summary className="t-caption muted" style={{ minHeight: 44, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>ⓘ {t.holidayAbout}</summary><p className="t-caption muted" style={{ lineHeight: 1.8 }}>{t.holidayNote}</p></details>
      </div>
      <section className="screen screen--flush cal__agenda" aria-label={f.fullLabel(sel)}>
        <div className="cal__agenda-in">
          <h2 className="t-body section-title" style={{ marginTop: 'var(--space-10)' }}>{(sel === T ? t.todayComma : '') + f.fullLabel(sel)}</h2>
          <span className="t-overline muted" style={{ fontWeight: 400, letterSpacing: 0 }}>{f.fa ? f.gLabel(sel) : f.jLabel(sel, true)}</span>
          <div>{agenda.map((a) => <AgendaRow key={a.key} title={a.title} time={a.time} color={a.color} onClick={a.edit} />)}</div>
          {agenda.length === 0 && <span className="t-small muted" style={{ padding: 'var(--space-8) 0' }}>{t.emptyDay}</span>}
          <TextButton small style={{ alignSelf: 'flex-start' }} onClick={() => ui.openAdd({ day: sel })}>{t.addOnDay}</TextButton>
        </div>
      </section>
    </main>
  );
}
