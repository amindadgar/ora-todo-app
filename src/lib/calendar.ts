import * as jalaali from 'jalaali-js';

/** A calendar day is represented by its Julian Day Number (integer) — timezone-free. */
export type Day = number;
export type CalMode = 'j' | 'g';

export const dayFromG = (gy: number, gm: number, gd: number): Day => jalaali.g2d(gy, gm, gd);
export const dayFromJ = (jy: number, jm: number, jd: number): Day => jalaali.j2d(jy, jm, jd);
export const toG = (d: Day) => jalaali.d2g(d);
export const toJ = (d: Day) => jalaali.d2j(d);

/** The user's local "today". Tests/screenshots can override via setToday. */
let override: Day | null = null;
export function setToday(d: Day | null) { override = d; }
export function today(): Day {
  if (override != null) return override;
  const n = new Date();
  return dayFromG(n.getFullYear(), n.getMonth() + 1, n.getDate());
}

/** Weekday index with Saturday = 0 … Friday = 6 (Persian week). */
export const weekdayIndex = (d: Day): number => (((d + 2) % 7) + 7) % 7;
export const isFriday = (d: Day) => weekdayIndex(d) === 6;

export const jalaliMonthLength = (jy: number, jm: number) => jalaali.jalaaliMonthLength(jy, jm);
export const gregorianMonthLength = (gy: number, gm: number) => dayFromG(gm === 12 ? gy + 1 : gy, gm === 12 ? 1 : gm + 1, 1) - dayFromG(gy, gm, 1);

export interface MonthInfo { mode: CalMode; year: number; month: number; start: Day; length: number }

/** Month `offset` months away from the month containing `anchor`, in the given calendar. */
export function monthAt(mode: CalMode, anchor: Day, offset: number): MonthInfo {
  if (mode === 'j') {
    const a = toJ(anchor); const idx = a.jm - 1 + offset;
    const year = a.jy + Math.floor(idx / 12), month = ((idx % 12) + 12) % 12 + 1;
    return { mode, year, month, start: dayFromJ(year, month, 1), length: jalaliMonthLength(year, month) };
  }
  const a = toG(anchor); const idx = a.gm - 1 + offset;
  const year = a.gy + Math.floor(idx / 12), month = ((idx % 12) + 12) % 12 + 1;
  return { mode, year, month, start: dayFromG(year, month, 1), length: gregorianMonthLength(year, month) };
}

/** Signed month distance between the months containing `anchor` and `d`. */
export function monthOffset(mode: CalMode, anchor: Day, d: Day): number {
  if (mode === 'j') { const a = toJ(anchor), b = toJ(d); return (b.jy - a.jy) * 12 + (b.jm - a.jm); }
  const a = toG(anchor), b = toG(d); return (b.gy - a.gy) * 12 + (b.gm - a.gm);
}

/** Start of the Saturday-first week containing d. */
export const weekStart = (d: Day): Day => d - weekdayIndex(d);

/** Date of the same day-of-month in the next Jalali / Gregorian month (clamped). */
export function sameDayNextMonth(mode: CalMode, from: Day, dayOfMonth: number): Day {
  const m = monthAt(mode, from, 1);
  const dd = Math.min(dayOfMonth, m.length);
  return m.start + dd - 1;
}

/** Add one year to an anniversary-style date, in the Jalali calendar (Esfand 30 → 29 when needed). */
export function nextYearly(d: Day, ref: Day): Day {
  const j = toJ(d); const r = toJ(ref);
  let y = r.jy;
  const make = (yy: number) => dayFromJ(yy, j.jm, Math.min(j.jd, jalaliMonthLength(yy, j.jm)));
  let c = make(y); if (c < ref) c = make(y + 1);
  return c;
}

// ---------- Iranian holidays (data copied from the prototype) ----------
// Fixed solar: [jm, jd, key]. Lunar-derived: [jy, jm, jd, key] — only 1405–1406 are known.
export const SOLAR_HOLIDAYS: [number, number, string][] = [
  [1, 1, 'nowruz'], [1, 2, 'nowruz'], [1, 3, 'nowruz'], [1, 4, 'nowruz'], [1, 12, 'republic'], [1, 13, 'nature'],
  [3, 14, 'khomeini'], [3, 15, 'khordad15'], [11, 22, 'revolution'], [12, 29, 'oil']
];
export const LUNAR_HOLIDAYS: [number, number, number, string][] = [
  [1405, 1, 1, 'fitrHoliday'], [1405, 1, 24, 'sadiq'], [1405, 3, 6, 'adha'], [1405, 3, 14, 'ghadir'], [1405, 4, 3, 'tasua'], [1405, 4, 4, 'ashura'],
  [1405, 5, 12, 'arbaeen'], [1405, 5, 20, 'prophetPassing'], [1405, 5, 22, 'reza'], [1405, 5, 30, 'askari'], [1405, 6, 8, 'prophetBirth'],
  [1405, 8, 22, 'fatimah'], [1405, 10, 1, 'aliBirth'], [1405, 10, 15, 'mabath'], [1405, 11, 3, 'shaban'], [1405, 12, 9, 'aliMartyr'],
  [1405, 12, 18, 'fitr'], [1405, 12, 19, 'fitrHoliday'],
  [1406, 1, 13, 'sadiq'], [1406, 2, 26, 'adha'], [1406, 3, 3, 'ghadir'], [1406, 3, 24, 'tasua'], [1406, 3, 25, 'ashura'], [1406, 5, 2, 'arbaeen'],
  [1406, 5, 10, 'prophetPassing'], [1406, 5, 19, 'askari'], [1406, 5, 28, 'prophetBirth'], [1406, 8, 11, 'fatimah'], [1406, 9, 20, 'aliBirth'],
  [1406, 10, 4, 'mabath'], [1406, 10, 22, 'shaban'], [1406, 11, 28, 'aliMartyr'], [1406, 12, 7, 'fitr'], [1406, 12, 8, 'fitrHoliday']
];
/** Returns the holiday key for a day, or null. Names live in the i18n dictionaries. */
export function holidayKey(d: Day): string | null {
  const j = toJ(d); let key: string | null = null;
  for (const h of SOLAR_HOLIDAYS) if (h[0] === j.jm && h[1] === j.jd) key = h[2];
  for (const h of LUNAR_HOLIDAYS) if (h[0] === j.jy && h[1] === j.jm && h[2] === j.jd) key = h[3];
  return key;
}
