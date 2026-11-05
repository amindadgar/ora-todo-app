import { ProgressBar } from './Progress';
/** Budget row: category, "x of y" and a bar that turns danger-red when over budget. */
export function BudgetRow({ name, value, pct, over, animate }: { name: string; value: string; pct: number; over: boolean; animate: boolean }) {
  return (
    <div className="budgetrow">
      <div className="budgetrow__top t-small"><span>{name}</span><span className={over ? 'danger' : 'muted'}>{value}</span></div>
      <ProgressBar value={pct} over={over} animate={animate} label={name} />
    </div>
  );
}
/** Transaction / bill / key-date style two-line button row with a trailing value. */
export function ValueRow({ title, sub, value, valueClass = '', titleSize = 'label', onClick }: { title: string; sub: string; value: string; valueClass?: string; titleSize?: 'label' | 'body'; onClick: () => void }) {
  return (
    <button type="button" className="row row--btn" onClick={onClick}>
      <span className="row__body"><span className={titleSize === 'label' ? 't-label' : 't-body'} style={{ fontWeight: 400 }}>{title}</span><span className="t-overline muted" style={{ fontWeight: 400, letterSpacing: 0 }}>{sub}</span></span>
      <span className={`t-small tnum ${valueClass}`} style={{ fontWeight: 600 }}>{value}</span>
    </button>
  );
}
