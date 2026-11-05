import { describe, it, expect } from 'vitest';
import { dayFromG, dayFromJ, toG, toJ, weekdayIndex, monthAt, monthOffset, jalaliMonthLength, gregorianMonthLength, holidayKey, weekStart, nextYearly, sameDayNextMonth } from '../src/lib/calendar';

const T = dayFromG(2026, 10, 6);
describe('Jalali ⇄ Gregorian', () => {
  it('6 Oct 2026 is 14 Mehr 1405', () => { expect(toJ(T)).toMatchObject({ jy: 1405, jm: 7, jd: 14 }); });
  it('Nowruz 1405 is 21 Mar 2026; 1404 → 21 Mar 2025', () => {
    expect(toG(dayFromJ(1405, 1, 1))).toMatchObject({ gy: 2026, gm: 3, gd: 21 });
    expect(toG(dayFromJ(1404, 1, 1))).toMatchObject({ gy: 2025, gm: 3, gd: 21 });
  });
  it('round-trips over 10 years', () => {
    for (let d = T - 1800; d < T + 1800; d += 7) { const j = toJ(d); expect(dayFromJ(j.jy, j.jm, j.jd)).toBe(d); const g = toG(d); expect(dayFromG(g.gy, g.gm, g.gd)).toBe(d); }
  });
});
describe('month lengths & leap years', () => {
  it('Jalali: 31×6, 30×5, Esfand 29/30', () => {
    expect([1, 6, 7, 11].map((m) => jalaliMonthLength(1405, m))).toEqual([31, 31, 30, 30]);
    expect(jalaliMonthLength(1403, 12)).toBe(30); // 1403 is leap
    expect(jalaliMonthLength(1405, 12)).toBe(29);
  });
  it('Gregorian Feb', () => { expect(gregorianMonthLength(2028, 2)).toBe(29); expect(gregorianMonthLength(2026, 2)).toBe(28); });
});
describe('weekday & week', () => {
  it('Saturday-first index (Tue = 3, Fri = 6)', () => { expect(weekdayIndex(T)).toBe(3); expect(weekdayIndex(T + 3)).toBe(6); expect(weekdayIndex(T - 3)).toBe(0); });
  it('weekStart is the Saturday', () => { expect(toG(weekStart(T))).toMatchObject({ gm: 10, gd: 3 }); });
});
describe('month navigation', () => {
  it('Jalali: Mehr 1405 starts on Thursday… and spans 30 days', () => {
    const m = monthAt('j', T, 0); expect(m).toMatchObject({ year: 1405, month: 7, length: 30 }); expect(weekdayIndex(m.start)).toBe(4);
    expect(toG(m.start)).toMatchObject({ gy: 2026, gm: 9, gd: 23 });
  });
  it('wraps across years in both directions', () => {
    expect(monthAt('j', T, 6)).toMatchObject({ year: 1406, month: 1 });
    expect(monthAt('j', T, -7)).toMatchObject({ year: 1404, month: 12 });
    expect(monthAt('g', T, 3)).toMatchObject({ year: 2027, month: 1 });
    expect(monthAt('g', T, -10)).toMatchObject({ year: 2025, month: 12 });
  });
  it('monthOffset is the inverse of monthAt', () => {
    for (const mode of ['j', 'g'] as const) for (let o = -30; o <= 30; o++) expect(monthOffset(mode, T, monthAt(mode, T, o).start + 3)).toBe(o);
  });
});
describe('helpers', () => {
  it('sameDayNextMonth clamps to month length', () => { expect(toG(sameDayNextMonth('g', dayFromG(2026, 1, 31), 31))).toMatchObject({ gm: 2, gd: 28 }); });
  it('nextYearly keeps Jalali month/day and handles Esfand 30', () => {
    const j = toJ(nextYearly(dayFromJ(1403, 12, 30), T)); expect(j).toMatchObject({ jy: 1405, jm: 12, jd: 29 });
    expect(toJ(nextYearly(dayFromJ(1390, 7, 9), T))).toMatchObject({ jy: 1406, jm: 7, jd: 9 });
  });
  it('holidays', () => {
    expect(holidayKey(dayFromJ(1405, 1, 2))).toBe('nowruz'); expect(holidayKey(dayFromJ(1405, 11, 22))).toBe('revolution');
    expect(holidayKey(dayFromJ(1405, 4, 4))).toBe('ashura'); expect(holidayKey(T)).toBeNull();
  });
});
