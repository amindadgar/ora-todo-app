import { useState } from 'react';
import { useData } from '../data/store';
import { useUI } from '../data/ui';
import { useI18n } from '../i18n';
import { today, toJ } from '../lib/calendar';
import { PageHeader } from '../components/Navigation';
import { SummaryCard, SectionHeader, GoalRow, Card } from '../components/Cards';
import { BudgetRow, ValueRow } from '../components/Money';
import { TextButton } from '../components/Buttons';
import { useCountUp } from '../interactions/useCountUp';
import { buzz } from '../interactions/haptics';
import type { CatId } from '../data/types';

export const BUDGET: Record<CatId, number> = { food: 9000000, transport: 3000000, fun: 3000000, bills: 2000000, home: 18000000, other: 3000000 };

export function usePlus() {
  const [pop, setPop] = useState<{ id: string; n: number } | null>(null);
  return { pop, fire: (id: string) => { setPop((p) => { const n = (p?.n ?? 0) + 1; setTimeout(() => setPop((q) => (q?.n === n ? null : q)), 720); return { id, n }; }); } };
}

export function MoneyScreen() {
  const f = useI18n(); const { t, SEP, text } = f; const ui = useUI();
  const { items, bills, savings } = useData(); const T = today(); const tj = toJ(T);
  const [showAll, setShowAll] = useState(false);
  const cu = useCountUp('money'); const plus = usePlus();
  const monthTx = items.filter((x) => (x.type === 'income' || x.type === 'expense') && toJ(x.day).jy === tj.jy && toJ(x.day).jm === tj.jm).sort((a, b) => b.day - a.day);
  const sum = (ty: string) => monthTx.filter((x) => x.type === ty).reduce((a, x) => a + (x.amount || 0), 0);
  const income = sum('income'), spent = sum('expense'), leftV = Math.max(0, income - spent);
  const budgets = (Object.keys(BUDGET) as CatId[]).filter((c) => c !== 'home').map((c) => [c, monthTx.filter((x) => x.type === 'expense' && (x.cat || 'other') === c).reduce((a, x) => a + (x.amount || 0), 0)] as const).filter(([, v]) => v > 0);
  const txs = showAll ? monthTx : monthTx.slice(0, 5);
  const sortedBills = [...bills].sort((a, b) => a.day - b.day);
  const addSaving = (id: string) => { buzz(8); plus.fire(id); useData.getState().mutate('savings', (l) => l.map((y) => (y.id === id ? { ...y, have: Math.min(y.target, y.have + 1000000) } : y))); };
  return (
    <main className="money" aria-label={t.money}>
      <PageHeader title={t.money} />
      <div className="screen screen--flush money__grid">
        <div className="money__sum"><SummaryCard label={t.leftThisMonth} value={f.moneyAs(leftV * cu.k(0), leftV)} income={f.moneyAs(income * cu.k(1), income)} spent={f.moneyAs(spent * cu.k(1), spent)} incomeLabel={t.income} spentLabel={t.spent} /></div>
        {income === 0 && spent === 0 && <p className="t-small muted money__empty" style={{ lineHeight: 1.8 }}>{t.emptyMoney}</p>}
        {budgets.length > 0 && (
          <section className="money__bud stack">
            <SectionHeader>{t.budgets}</SectionHeader>
            <Card as="div" className="list" ><div style={{ padding: 'var(--space-4) 0' }}>
              {budgets.map(([c, v], i) => { const k = cu.k(i + 2), r = (v * k) / BUDGET[c]; return <BudgetRow key={c} name={t.cats[c]} value={f.pair(v * k, BUDGET[c])} pct={Math.min(100, r * 100)} over={r > 1} animate={!cu.animating} />; })}
            </div></Card>
          </section>
        )}
        {monthTx.length > 0 && (
          <section className="money__tx stack">
            <SectionHeader>{t.transactions}</SectionHeader>
            <Card as="div" className="list">{txs.map((x) => (
              <ValueRow key={x.id} title={text(x.title)} sub={f.shortDate(x.day) + (x.type === 'expense' ? SEP + t.cats[x.cat || 'other'] : '')} value={(x.type === 'income' ? '+ ' : '− ') + f.money(x.amount || 0)} valueClass={x.type === 'income' ? 'success' : ''} titleSize="body" onClick={() => ui.openEdit('items', x.id)} />
            ))}</Card>
            {monthTx.length > 5 && <TextButton small style={{ alignSelf: 'flex-start' }} onClick={() => setShowAll(!showAll)}>{showAll ? t.showLess : t.allTx(f.N(monthTx.length))}</TextButton>}
          </section>
        )}
        <div className="money__side">
          <section className="stack">
            <SectionHeader>{t.bills}</SectionHeader>
            {sortedBills.length === 0 ? <span className="t-small muted">{t.emptyBills}</span> : (
              <Card as="div" className="list">{sortedBills.map((b) => { const d = b.day - T;
                return <ValueRow key={b.id} title={text(b.title)} sub={f.shortDate(b.day) + SEP + (d === 0 ? t.todayLower : t.inDays(f.N(d)))} value={f.money(b.amount)} titleSize="body" onClick={() => ui.openEdit('bills', b.id)} />; })}</Card>
            )}
          </section>
          <section className="stack">
            <SectionHeader>{t.savings}</SectionHeader>
            {savings.length === 0 ? <span className="t-small muted">{t.emptySavings}</span> : (
              <Card as="div" className="list"><div style={{ padding: 'var(--space-4) 0' }}>{savings.map((s) => {
                const k = cu.k(4); return <GoalRow key={s.id} size="saving" title={text(s.title)} detail={f.pair(s.have * k, s.target)} progress={(s.have * k / s.target) * 100} animate={!cu.animating}
                  plusLabel={t.plusOneM} plusAria={t.addOneMTo + text(s.title)} floatOn={plus.pop?.id === s.id} floatAnim={`${(plus.pop?.n ?? 0) % 2 ? 'rz-float-a' : 'rz-float-b'} .7s ease-out both`} floatClass={String(plus.pop?.n)}
                  onEdit={() => ui.openEdit('savings', s.id)} onPlus={() => addSaving(s.id)} />; })}</div></Card>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
