import { Day, dayFromG, dayFromJ, toG, toJ, jalaliMonthLength, weekdayIndex, sameDayNextMonth } from './calendar';
import { toFaDigits, toLatinDigits } from './digits';

/**
 * Smart-input parser. Port of the prototype's parse()/detect() as pure functions
 * (today is injected; no hidden state). Understands English + Persian, Persian digits,
 * relative dates, weekdays, month names, times (am/pm, ساعت …), amounts (K/M, هزار/میلیون).
 */
export type EntryType = 'task' | 'event' | 'reminder' | 'important' | 'expense' | 'income' | 'bill' | 'saving' | 'wish' | 'goal';

export interface Parsed {
  day: Day | null;
  /** "HH:MM" 24h or null */
  time: string | null;
  amount: number | null;
  title: string;
  /** exact substrings (Latin-digit form) that were understood — for highlighting */
  marks: string[];
  /** hour given without am/pm (needs the morning/evening question) */
  ambiguous: boolean;
  hour?: number;
  min?: string;
}

const JMN = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const EMN = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const WE: [string, string][] = [['saturday', 'شنبه'], ['sunday', 'یکشنبه'], ['monday', 'دوشنبه'], ['tuesday', 'سه‌شنبه'], ['wednesday', 'چهارشنبه'], ['thursday', 'پنجشنبه'], ['friday', 'جمعه']];
const pad = (n: number) => (n < 10 ? '0' : '') + n;

export function parseEntry(raw: string, today: Day, fa: boolean): Parsed {
  const s = toLatinDigits(raw);
  const r: Parsed = { day: null, time: null, amount: null, title: s, marks: [], ambiguous: false };
  let m: RegExpMatchArray | null;
  const cut = (re: string | RegExp) => {
    if (typeof re === 'string' && re.trim()) r.marks.push(re);
    r.title = r.title.replace(re, ' ');
  };
  const tj = toJ(today);

  if ((m = s.match(/(\d{1,2})\s*(?:ماه|م)\s*(?:بعد|دیگه|دیگر|آینده)/))) {
    const nm = tj.jm === 12 ? 1 : tj.jm + 1, ny = tj.jm === 12 ? tj.jy + 1 : tj.jy;
    r.day = dayFromJ(ny, nm, Math.min(+m[1], jalaliMonthLength(ny, nm))); cut(m[0]);
  } else if ((m = s.match(/(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?next month/i))) {
    r.day = sameDayNextMonth('g', today, +m[1]); cut(m[0]); cut(/\bon\b/i);
  } else if ((m = s.match(/(?:ماه\s*(?:بعد|دیگه|آینده))|next month/i))) { r.day = today + 30; cut(m[0]); }
  else if ((m = s.match(/پس\s*‌?\s*فردا|day after tomorrow/i))) { r.day = today + 2; cut(m[0]); }
  else if ((m = s.match(/فردا|tomorrow/i))) { r.day = today + 1; cut(m[0]); }
  else if ((m = s.match(/امروز|today/i))) { r.day = today; cut(m[0]); }
  else if ((m = s.match(/(\d+)\s*روز\s*(?:بعد|دیگه|دیگر)|in (\d+) days/i))) { r.day = today + +(m[1] || m[2]); cut(m[0]); }
  else if ((m = s.match(/هفته\s*(?:بعد|دیگه|آینده)|next week/i))) { r.day = today + 7; cut(m[0]); }
  else {
    for (let i = 0; i < 12; i++) {
      const re = new RegExp('(\\d{1,2})\\s*' + JMN[i] + '(?![\\u0600-\\u06FF])');
      if ((m = s.match(re))) {
        let cand = dayFromJ(tj.jy, i + 1, +m[1]); if (cand < today) cand = dayFromJ(tj.jy + 1, i + 1, +m[1]);
        r.day = cand; cut(m[0]); break;
      }
    }
    if (r.day == null && (m = s.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b|\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i))) {
      const gm = EMN.indexOf((m[1] || m[4]).toLowerCase()) + 1, gd = +(m[2] || m[3]), gy = toG(today).gy;
      let cg = dayFromG(gy, gm, gd); if (cg < today) cg = dayFromG(gy + 1, gm, gd);
      r.day = cg; cut(m[0]);
    }
    if (r.day == null) {
      for (let w = 6; w >= 0; w--) {
        const rw = new RegExp(WE[w][1] + '|\\b' + WE[w][0] + '\\b|\\b' + WE[w][0].slice(0, 3) + '\\b', 'i');
        if ((m = s.match(rw)) && !(w === 0 && /یکشنبه|دوشنبه|سه‌شنبه|چهارشنبه|پنجشنبه/.test(s))) {
          const diff = (w - weekdayIndex(today) + 7) % 7 || 7; r.day = today + diff; cut(m[0]); break;
        }
      }
    }
  }

  if ((m = s.match(/ساعت\s*(\d{1,2})(?::(\d{2}))?\s*(صبح|ظهر|عصر|شب)?/))) {
    let h = +m[1];
    if (!m[3] && h >= 1 && h <= 11) { r.ambiguous = true; r.hour = h; r.min = m[2] || '00'; }
    if (m[3] === 'شب' || m[3] === 'عصر' || (m[3] === 'ظهر' && h < 11) || (!m[3] && h >= 1 && h <= 7)) { if (h < 12) h += 12; }
    r.time = pad(h) + ':' + (m[2] || '00'); cut(m[0]);
  } else if ((m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i))) {
    const hh = (+m[1] % 12) + (m[3].toLowerCase() === 'pm' ? 12 : 0);
    r.time = pad(hh) + ':' + (m[2] || '00'); cut(m[0]);
  }

  if ((m = s.match(/(\d+(?:\.\d+)?)\s*(میلیون|هزار|[mk])\b/i)) || (m = s.match(/(\d+(?:\.\d+)?)\s*(میلیون|هزار)/))) {
    const unit = m[2].toLowerCase();
    r.amount = Math.round(parseFloat(m[1]) * (unit === 'میلیون' || unit === 'm' ? 1e6 : 1e3));
    cut(m[0]); cut(/تومن|تومان|toman/gi);
  }
  cut(/\bat\b|\bon\b|ساعت/gi);
  r.title = r.title.replace(/\s+/g, ' ').trim();
  if (fa) r.title = toFaDigits(r.title);
  return r;
}

/** Resolve the morning/evening question for an ambiguous hour. */
export function applyMeridiem(p: Parsed, sel: 'am' | 'pm' | null): { parsed: Parsed; chosen: 'am' | 'pm' | null } {
  if (!p.ambiguous || p.hour == null) return { parsed: p, chosen: null };
  const chosen = sel || (p.hour <= 7 ? 'pm' : 'am');
  const h24 = chosen === 'pm' ? p.hour + 12 : p.hour;
  return { parsed: { ...p, time: pad(h24) + ':' + p.min }, chosen };
}

/** Guess the entry type from text + what was parsed. */
export function detectType(raw: string, p: Parsed): EntryType {
  const s = toLatinDigits(raw);
  if (p.amount) {
    if (/حقوق|درآمد|دستمزد|salary|income|paid me/i.test(s)) return 'income';
    if (/قسط|اجاره|قبض|اشتراک|rent|installment|bill|subscription/i.test(s)) return 'bill';
    if (/پس\s*‌?انداز|سفر|خرید .* جدید|save|saving|trip/i.test(s)) return 'saving';
    return 'expense';
  }
  if (/تولد|سالگرد|birthday|anniversary/i.test(s)) return 'important';
  if (/یادم بنداز|یادآوری|زنگ|remind|call /i.test(s)) return 'reminder';
  if (/هدف|goal|\d+\s*(کتاب|جلسه|بار|books|workouts|times)/i.test(s) && p.day == null) return 'goal';
  if (/یه روز|یک روز|دوست دارم|someday|one day|would love/i.test(s) && p.day == null) return 'wish';
  if (p.time) return 'event';
  return 'task';
}

/** Expense category from the title. */
export function categoryOf(title: string): 'food' | 'transport' | 'fun' | 'bills' | 'home' | 'other' {
  const s = toLatinDigits(title);
  const rules: [string, RegExp][] = [
    ['food', /نان|میوه|سوپر|خرید خونه|خرید خانه|رستوران|کافه|غذا|ناهار|شام|groceries|grocery|food|fruit|bread|coffee|breakfast|restaurant|cafe|lunch|dinner/i],
    ['transport', /تاکسی|اسنپ|تپسی|بنزین|مترو|اتوبوس|taxi|uber|fuel|metro|bus|ride/i],
    ['fun', /سینما|تئاتر|کنسرت|بازی|سفر|cinema|movie|theatre|concert|game|trip/i],
    ['bills', /قبض|اینترنت|برق|آب|گاز|موبایل|شارژ|bill|internet|power|water|gas|phone/i],
    ['home', /اجاره|شارژ ساختمان|rent/i]
  ];
  for (const [k, re] of rules) if (re.test(s)) return k as 'food';
  return 'other';
}
