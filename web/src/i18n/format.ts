import { dicts, type Lang, type LText } from './dict';
import { toFaDigits } from '../lib/digits';
import { toG, toJ, weekdayIndex, holidayKey, type Day } from '../lib/calendar';
import type { Currency } from '../data/types';

/** First-strong isolate: keeps mixed LTR/RTL fragments from reordering. */
export const ISO = (x: string) => '⁨' + x + '⁩';

export function makeFormat(lang: Lang, currency: Currency = 'toman') {
  const fa = lang === 'fa', t = dicts[lang];
  const SEP = fa ? '، ' : ' · ';
  const N = (n: number | string) => (fa ? toFaDigits(n) : String(n));
  const L = <A, B>(a: A, b: B) => (fa ? a : b);
  const text = (v: LText | null | undefined) => (v == null ? '' : typeof v === 'string' ? v : v[lang]);
  const r1 = (x: number) => Math.round(x * 10) / 10;
  const unit = currency === 'rial' ? L('ریال', 'rial') : L('تومان', 'toman');
  const k = currency === 'rial' ? 10 : 1;
  const compact = (v: number, ref = v) => {
    if (ref >= 1e6) return fa ? `${N(r1(v / 1e6))} میلیون ${unit}` : `${r1(v / 1e6)}M ${unit}`;
    if (ref >= 1e3) return fa ? `${N(r1(v / 1e3))} هزار ${unit}` : `${r1(v / 1e3)}K ${unit}`;
    return `${N(Math.round(v))} ${unit}`;
  };
  /** Money amounts are stored in toman. */
  const money = (toman: number) => ISO(compact(toman * k));
  /** Animated value scaled against its final value (so the unit doesn't flicker while counting). */
  const moneyAs = (v: number, ref: number) => ISO(compact(v * k, ref * k));
  const pair = (a: number, b: number) => {
    const va = a * k, vb = b * k;
    if (vb >= 1e6) return ISO(fa ? `${N(r1(va / 1e6))} از ${N(r1(vb / 1e6))} میلیون ${unit}` : `${r1(va / 1e6)}M of ${r1(vb / 1e6)}M ${unit}`);
    return money(a) + t.of + money(b);
  };
  const time = (v: string) => {
    if (!v) return '';
    if (fa) return ISO(N(v));
    const [h, m] = v.split(':'); const hh = +h;
    return ISO(`${hh % 12 || 12}:${m}${hh >= 12 ? ' pm' : ' am'}`);
  };
  const jLabel = (d: Day, withYear = false) => { const j = toJ(d); return ISO(`${N(j.jd)} ${t.jMonths[j.jm - 1]}${withYear ? ' ' + N(j.jy) : ''}`); };
  const gLabel = (d: Day) => { const g = toG(d); return ISO(fa ? `${N(g.gd)} ${t.gMonths[g.gm - 1]} ${N(g.gy)}` : `${t.gMonths[g.gm - 1].slice(0, 3)} ${g.gd}, ${g.gy}`); };
  const weekday = (d: Day) => t.weekdaysLong[weekdayIndex(d)];
  const fullLabel = (d: Day) => weekday(d) + ' ' + (fa ? jLabel(d, true) : gLabel(d));
  const shortDate = (d: Day) => (fa ? jLabel(d) : gLabel(d).replace(/, \d+(⁩)$/, '$1'));
  const holiday = (d: Day) => { const key = holidayKey(d); return key ? t.holidays[key] : null; };
  const percent = (n: number) => N(n) + (fa ? '٪' : '%');
  return { lang, fa, t, SEP, N, L, text, money, moneyAs, pair, time, jLabel, gLabel, weekday, fullLabel, shortDate, holiday, percent };
}
export type Fmt = ReturnType<typeof makeFormat>;
