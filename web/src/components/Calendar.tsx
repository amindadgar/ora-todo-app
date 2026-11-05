import { IconButton } from './Buttons';

/** Week-strip day (Home). */
export function WeekDay({ wd, n, today, holiday, hasEvent, label, onClick }: { wd: string; n: string; today: boolean; holiday: boolean; hasEvent: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" role="listitem" aria-label={label} aria-current={today ? 'date' : undefined} onClick={onClick}
      className={`weekday${today ? ' weekday--today' : ''}${holiday && !today ? ' weekday--holiday' : ''}`}>
      <span className="weekday__wd">{wd}</span><span className="weekday__n">{n}</span><span className={`dot${hasEvent ? ' dot--on' : ''}`} />
    </button>
  );
}
/** Month-grid day. */
export function CalendarDay({ n, alt, selected, today, red, hasEvent, label, onClick, tabIndex }: { n: string; alt?: string; selected: boolean; today: boolean; red: boolean; hasEvent: boolean; label: string; onClick: () => void; tabIndex?: number }) {
  return (
    <button type="button" aria-label={label} aria-pressed={selected} data-day tabIndex={tabIndex} onClick={onClick}
      className={`calday${selected ? ' calday--sel' : today ? ' calday--today' : ''}${red ? ' calday--red' : ''}`}>
      <span className="calday__n">{n}</span>{alt != null && <span className="calday__alt">{alt}</span>}<span className={`dot${hasEvent ? ' dot--on' : ''}`} />
    </button>
  );
}
/** Month header: prev / title+subtitle / next (chevrons mirror in RTL). */
export function MonthHeader({ title, sub, prevLabel, nextLabel, onPrev, onNext }: { title: string; sub: string; prevLabel: string; nextLabel: string; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="monthhead">
      <IconButton icon="chevron-left" kind="plain" size={22} label={prevLabel} onClick={onPrev} />
      <div className="monthhead__title" aria-live="polite"><span className="t-subheading">{title}</span><span className="t-overline muted" style={{ fontWeight: 400, letterSpacing: 0 }}>{sub}</span></div>
      <IconButton icon="chevron-right" kind="plain" size={22} label={nextLabel} onClick={onNext} />
    </div>
  );
}
