import { useState } from 'react';
import { useData } from '../data/store';
import { useUI } from '../data/ui';
import { useNav } from '../data/nav';
import { useAuth } from '../data/auth';
import { useI18n } from '../i18n';
import { today } from '../lib/calendar';
import { buildReport, type Range } from '../lib/report';
import { PageHeader } from '../components/Navigation';
import { GoalRow, ReviewCard } from '../components/Cards';
import { ListCard } from '../components/Lists';
import { Tabs } from '../components/Selection';
import { ChartBars } from '../components/Progress';
import { TextButton } from '../components/Buttons';
import { useCountUp } from '../interactions/useCountUp';
import { buzz } from '../interactions/haptics';
import { usePlus } from './Money';
import { useCalMode } from './Home';

export function GoalsScreen() {
  const f = useI18n(); const { t, N, text } = f; const ui = useUI(); const nav = useNav(); const mode = useCalMode(); const T = today(); const auth = useAuth((a) => a.mode);
  const { goals, activity, settings, items } = useData(); const [range, setRange] = useState<Range>('week');
  const cu = useCountUp('goals|' + range); const plus = usePlus();
  const rep = buildReport(range, activity, T, mode); const max = Math.max(1, ...rep.bars.map((b) => b.value));
  const label = (i: number, key: string) => range === 'day' ? [t.chart.am, t.chart.noon, t.chart.pm, t.chart.night][i] : range === 'week' ? t.weekdaysShort[i]
    : range === 'month' ? t.chart.w + N(key) : (mode === 'j' ? t.jMonths : t.gMonths)[+key - 1].slice(0, 3);
  const bars = rep.bars.map((b, i) => { const k = cu.k(i + 1); return { label: label(i, b.key), value: b.value ? N(Math.round(b.value * k)) : '', h: Math.max(3, Math.round((b.value / max) * 100 * k)), zero: !b.value }; });
  const pct = (a: number, b: number) => f.percent(Math.round(Math.abs(a - b) / b * 100));
  const note = rep.total === 0 ? t.chart.empty
    : range === 'day' ? t.chart.todayDone(N(rep.total), N(Math.max(rep.total, items.filter((x) => x.day === T && (x.type === 'task' || x.type === 'event')).length)))
    : range === 'week' ? (rep.bestIndex >= 0 ? t.chart.best(t.weekdaysLong[rep.bestIndex]) : '')
    : range === 'month' ? (rep.prevTotal ? (rep.total >= rep.prevTotal ? t.chart.better(pct(rep.total, rep.prevTotal)) : t.chart.worse(pct(rep.total, rep.prevTotal))) : '')
    : t.chart.tasksSoFar(N(rep.total));
  const plusOne = (id: string) => {
    const g = goals.find((x) => x.id === id)!; const complete = g.have + 1 >= g.target && g.have < g.target; buzz(8); plus.fire(id);
    useData.getState().mutate('goals', (l) => l.map((y) => (y.id === id ? { ...y, have: Math.min(y.target, y.have + 1) } : y)));
    if (complete) { ui.notify(t.goalDone(text(g.title))); setTimeout(ui.fireCelebrate, 150); }
  };
  return (
    <main aria-label={t.goals}>
      <PageHeader title={t.goals} onBack={nav.back} backLabel={t.back} />
      <div className="screen screen--flush goals">
        <div className="goals__list">
          {goals.length === 0 && <p className="t-small muted" style={{ lineHeight: 1.8 }}>{t.emptyGoals}</p>}
          {goals.length > 0 && <ListCard>{goals.map((g, i) => {
            const r = Math.min(1, g.have / g.target), k = cu.k(i);
            return <GoalRow key={g.id} title={text(g.title)} right={f.percent(Math.round(r * k * 100))} progress={r * k * 100} animate={!cu.animating}
              detail={r >= 1 ? t.madeIt : N(Math.round(g.have * k)) + t.of + N(g.target) + (text(g.unit) ? ' ' + text(g.unit) : '')}
              plusLabel={t.plusOne} plusAria={t.addOneTo + text(g.title)} floatOn={plus.pop?.id === g.id} floatAnim={`${(plus.pop?.n ?? 0) % 2 ? 'rz-float-a' : 'rz-float-b'} .7s ease-out both`} floatClass={String(plus.pop?.n)}
              onEdit={() => ui.openEdit('goals', g.id)} onPlus={() => plusOne(g.id)} />; })}</ListCard>}
          <TextButton style={{ alignSelf: 'flex-start' }} onClick={() => ui.openAdd({ type: 'goal' })}>{t.addGoal}</TextButton>
        </div>
        <div className="goals__report">
          <section className="stack" style={{ gap: 'var(--space-12)' }}>
            <Tabs label={t.tasksCompleted} value={range} options={[['day', t.goalTabs.day], ['week', t.goalTabs.week], ['month', t.goalTabs.month], ['year', t.goalTabs.year]]} onChange={setRange} />
            <div className="stack">
              <span className="t-small" style={{ fontWeight: 600 }}>{t.tasksCompleted}</span>
              <ChartBars bars={bars} />
              <span className="t-caption muted">{note}</span>
            </div>
          </section>
          {auth === 'guest' && !settings.fresh && <ReviewCard title={t.yearTitle} line={t.yearLine} stats={t.yearStats} />}
        </div>
      </div>
    </main>
  );
}
