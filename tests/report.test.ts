import { describe, it, expect } from 'vitest';
import { buildReport } from '../src/lib/report';
import { dayFromG, weekStart, monthAt } from '../src/lib/calendar';
import type { Activity } from '../src/data/types';

const T = dayFromG(2026, 10, 6); // Tuesday
const ws = weekStart(T);
const act: Activity[] = [
  { day: ws, b: [2, 1, 2, 1] },        // Sat: 6
  { day: ws + 1, b: [3, 2, 2, 1] },    // Sun: 8  (best)
  { day: ws + 3, b: [1, 0, 0, 0] },    // Tue (today): 1
  { day: ws - 3, b: [5, 0, 0, 0] }     // previous week
];
describe('buildReport', () => {
  it('week: 7 buckets, Saturday first, best day found', () => {
    const r = buildReport('week', act, T, 'g'); expect(r.bars.map((b) => b.value)).toEqual([6, 8, 0, 1, 0, 0, 0]);
    expect(r.bestIndex).toBe(1); expect(r.total).toBe(15); expect(r.prevTotal).toBe(5);
  });
  it('day: time-of-day buckets of today', () => { expect(buildReport('day', act, T, 'g').bars.map((b) => b.value)).toEqual([1, 0, 0, 0]); });
  it('month: 7-day chunks; includes the last partial chunk', () => {
    const r = buildReport('month', act, T, 'g'); expect(r.bars).toHaveLength(5); expect(r.total).toBe(15 + 0);
  });
  it('month in Jalali uses Jalali month boundaries', () => {
    const m = monthAt('j', T, 0); const a: Activity[] = [{ day: m.start, b: [1, 1, 1, 1] }, { day: m.start - 1, b: [9, 0, 0, 0] }];
    const r = buildReport('month', a, T, 'j'); expect(r.bars[0].value).toBe(4); expect(r.total).toBe(4); expect(r.prevTotal).toBe(9);
  });
  it('year: one bucket per month up to the current month', () => { expect(buildReport('year', act, T, 'g').bars).toHaveLength(10); expect(buildReport('year', act, T, 'j').bars).toHaveLength(7); });
  it('empty log → zeros, no best day', () => { const r = buildReport('week', [], T, 'g'); expect(r.total).toBe(0); expect(r.bestIndex).toBe(-1); });
});
