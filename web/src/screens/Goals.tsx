import { useData } from '../data/store';
import { useUI } from '../data/ui';
import { useNav } from '../data/nav';
import { useI18n } from '../i18n';
import { today } from '../lib/calendar';
import { buildReport } from '../lib/report';
import { PageHeader } from '../components/Navigation';
import { GoalRow } from '../components/Cards';
import { ListCard } from '../components/Lists';
import { TextButton } from '../components/Buttons';
import { useCountUp } from '../interactions/useCountUp';
import { buzz } from '../interactions/haptics';
import { usePlus } from './Money';
import { useCalMode } from './Home';

export function GoalsScreen() {
  const f = useI18n(); const { t, N, text } = f; const ui = useUI(); const nav = useNav(); const { go } = nav; const mode = useCalMode(); const T = today();
  const { goals, activity } = useData();
  const cu = useCountUp('goals|week'); const plus = usePlus();
  const rep = buildReport('week', activity, T, mode);
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
        <button type="button" className="o-soft insightslink" onClick={() => go('insights')} data-testid="insights-link" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)', padding: 'var(--space-12) var(--space-14)', minHeight: 56, textAlign: 'start', width: '100%' }}>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}><b className="t-body">{t.weekDoneLine(N(rep.total))}</b>{rep.bestIndex >= 0 && <span className="t-caption on-soft">{t.chart.best(t.weekdaysLong[rep.bestIndex])}</span>}</span>
          <b className="t-small brand">{t.insights} {f.fa ? '‹' : '›'}</b>
        </button>
      </div>
    </main>
  );
}
