import { monthAt, weekStart, today as todayFn, type CalMode, type Day } from './calendar';
import type { Activity } from '../data/types';

export type Range = 'day' | 'week' | 'month' | 'year';
export interface Bucket { key: string; value: number; label?: number }
export interface Report { bars: Bucket[]; total: number; prevTotal: number | null; bestIndex: number }

const sum = (a: Activity | undefined) => (a ? a.b[0] + a.b[1] + a.b[2] + a.b[3] : 0);
const countRange = (act: Activity[], from: Day, to: Day) => act.reduce((n, a) => (a.day >= from && a.day <= to ? n + sum(a) : n), 0);

/**
 * Build chart buckets from the completion log.
 *  day   → morning / noon / evening / night for `today`
 *  week  → the 7 days of the Saturday-first week of `today`
 *  month → 7-day chunks of the current month in the main calendar
 *  year  → each month of the current year up to the current month
 */
export function buildReport(range: Range, act: Activity[], today: Day, mode: CalMode): Report {
  let bars: Bucket[] = [], prevTotal: number | null = null;
  if (range === 'day') {
    const a = act.find((x) => x.day === today);
    bars = [0, 1, 2, 3].map((i) => ({ key: String(i), value: a ? a.b[i] : 0 }));
  } else if (range === 'week') {
    const ws = weekStart(today);
    bars = [0, 1, 2, 3, 4, 5, 6].map((i) => ({ key: String(i), value: sum(act.find((x) => x.day === ws + i)) }));
    const pws = ws - 7; prevTotal = countRange(act, pws, pws + 6);
  } else if (range === 'month') {
    const m = monthAt(mode, today, 0), chunks = Math.ceil(m.length / 7);
    bars = Array.from({ length: chunks }, (_, i) => ({ key: String(i + 1), value: countRange(act, m.start + i * 7, Math.min(m.start + m.length - 1, m.start + i * 7 + 6)) }));
    const pm = monthAt(mode, today, -1); prevTotal = countRange(act, pm.start, pm.start + pm.length - 1);
  } else {
    const cur = monthAt(mode, today, 0);
    bars = Array.from({ length: cur.month }, (_, i) => { const m = monthAt(mode, today, i + 1 - cur.month); return { key: String(m.month), value: countRange(act, m.start, m.start + m.length - 1) }; });
  }
  const total = bars.reduce((n, b) => n + b.value, 0);
  const max = Math.max(0, ...bars.map((b) => b.value));
  return { bars, total, prevTotal, bestIndex: max > 0 ? bars.findIndex((b) => b.value === max) : -1 };
}
export const todayDefault = todayFn;
