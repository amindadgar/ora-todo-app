/** Progress bar. `animate` disables the width transition while a count-up drives the value. */
export function ProgressBar({ value, over, animate = true, label }: { value: number; over?: boolean; animate?: boolean; label?: string }) {
  return (
    <div className={`progress${over ? ' progress--over' : ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)} aria-label={label}>
      <div className={`progress__bar${animate ? '' : ' progress__bar--anim'}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
/** Bar chart (Goals report). Heights are px of a 130px plot; values/labels come from the caller. */
export function ChartBars({ bars }: { bars: { label: string; value: string; h: number; zero: boolean }[] }) {
  return (
    <>
      <div className="chart" role="img">
        {bars.map((b, i) => (
          <div key={i} className="chart__col">
            <span className="t-micro muted" style={{ fontWeight: 400 }}>{b.value}</span>
            <span className={`chart__bar${b.zero ? ' chart__bar--zero' : ''}`} style={{ height: b.h }} />
          </div>
        ))}
      </div>
      <div className="chart__labels">{bars.map((b, i) => <span key={i} className="t-micro muted" style={{ fontWeight: 400 }}>{b.label}</span>)}</div>
    </>
  );
}
