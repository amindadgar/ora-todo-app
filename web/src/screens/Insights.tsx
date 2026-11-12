import { useState } from 'react';
import { useData } from '../data/store';
import { useNav } from '../data/nav';
import { useAuth } from '../data/auth';
import { useI18n } from '../i18n';
import { today } from '../lib/calendar';
import { buildReport, type Range } from '../lib/report';
import { PageHeader } from '../components/Navigation';
import { ReviewCard } from '../components/Cards';
import { Tabs } from '../components/Selection';
import { ChartBars } from '../components/Progress';
import { useCountUp } from '../interactions/useCountUp';
import { useCalMode } from './Home';

export function InsightsScreen() {
  const f = useI18n(); const { t, N } = f; const nav = useNav(); const mode = useCalMode(); const T = today(); const auth = useAuth((a) => a.mode);
  const { activity, settings, items } = useData(); const [range, setRange] = useState<Range>('week');
  const cu = useCountUp('insights|' + range);
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
  return (
    <main aria-label={t.insights} className="narrow">
      <PageHeader title={t.insights} onBack={nav.back} backLabel={t.back} />
      <div className="screen screen--flush">
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
    </main>
  );
}
