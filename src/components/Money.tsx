import { ProgressBar } from './Progress';
import { ActionMenu, useActionMenu, type MenuAction } from './Lists';
import { IconButton } from './Buttons';
/** Budget row: category, "x of y" and a bar that turns danger-red when over budget. */
export function BudgetRow({ name, value, pct, over, animate }: { name: string; value: string; pct: number; over: boolean; animate: boolean }) {
  return (
    <div className="budgetrow">
      <div className="budgetrow__top t-small"><span>{name}</span><span className={over ? 'danger' : 'muted'}>{value}</span></div>
      <ProgressBar value={pct} over={over} animate={animate} label={name} />
    </div>
  );
}
/** Transaction / bill / key-date style two-line row with a trailing value; optional ⋯ + right-click menu (desktop). */
export function ValueRow({ title, sub, value, valueClass = '', titleSize = 'label', strong, onClick, actions, moreLabel = '' }:
  { title: string; sub: string; value: string; valueClass?: string; titleSize?: 'label' | 'body'; strong?: boolean; onClick: () => void; actions?: MenuAction[]; moreLabel?: string }) {
  const am = useActionMenu();
  return (
    <div className="row row--btn" onContextMenu={actions ? (e) => { e.preventDefault(); am.openAt(e.clientX, e.clientY); } : undefined}>
      <button type="button" className="row__main" onClick={onClick}>
        <span className="row__body"><span className={titleSize === 'label' ? 't-label' : 't-body'} style={{ fontWeight: strong ? 600 : 400 }}>{title}</span><span className="t-overline muted" style={{ fontWeight: 400, letterSpacing: 0 }}>{sub}</span></span>
        <span className={`t-small tnum ${valueClass}`} style={{ fontWeight: 600 }}>{value}</span>
      </button>
      {actions && <span className="taskrow__more"><IconButton icon="more2" kind="muted" label={moreLabel} aria-haspopup="menu" onClick={(e) => am.openAtButton(e.currentTarget)} /></span>}
      {am.menu && actions && <ActionMenu actions={actions} at={am.menu} onClose={am.close} />}
    </div>
  );
}
