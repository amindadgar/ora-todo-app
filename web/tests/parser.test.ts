import { describe, it, expect } from 'vitest';
import { parseEntry, detectType, applyMeridiem, categoryOf } from '../src/lib/parser';
import { dayFromG, toG, toJ } from '../src/lib/calendar';

// Tuesday 6 Oct 2026 = 14 Mehr 1405 (the prototype's reference day)
const T = dayFromG(2026, 10, 6);
const g = (d: number) => { const x = toG(d); return `${x.gy}-${x.gm}-${x.gd}`; };

describe('parseEntry — English', () => {
  it('"dentist tomorrow 5pm" → tomorrow 17:00, title Dentist, event', () => {
    const p = parseEntry('dentist tomorrow 5pm', T, false);
    expect(g(p.day!)).toBe('2026-10-7'); expect(p.time).toBe('17:00'); expect(p.title).toBe('dentist');
    expect(p.marks).toEqual(['tomorrow', '5pm']); expect(detectType('dentist tomorrow 5pm', p)).toBe('event');
  });
  it('day after tomorrow / in N days / next week', () => {
    expect(g(parseEntry('call the insurer day after tomorrow 9am', T, false).day!)).toBe('2026-10-8');
    expect(g(parseEntry('pay fee in 5 days', T, false).day!)).toBe('2026-10-11');
    expect(g(parseEntry('review next week', T, false).day!)).toBe('2026-10-13');
  });
  it('weekday names resolve to the next occurrence', () => {
    expect(g(parseEntry('lunch friday', T, false).day!)).toBe('2026-10-9');
    expect(g(parseEntry('gym tuesday', T, false).day!)).toBe('2026-10-13'); // never "today"
  });
  it('month names and "the 25th next month"', () => {
    expect(g(parseEntry('trip Nov 12', T, false).day!)).toBe('2026-11-12');
    expect(g(parseEntry('renew insurance on the 25th next month', T, false).day!)).toBe('2026-11-25');
  });
  it('12-hour clock edge cases', () => {
    expect(parseEntry('x 12am', T, false).time).toBe('00:00');
    expect(parseEntry('x 12pm', T, false).time).toBe('12:00');
    expect(parseEntry('x 9:30 am', T, false).time).toBe('09:30');
  });
  it('amounts K / M and type detection', () => {
    const e = parseEntry('250K taxi', T, false); expect(e.amount).toBe(250000); expect(detectType('250K taxi', e)).toBe('expense');
    const i = parseEntry('salary 48M', T, false); expect(i.amount).toBe(48000000); expect(detectType('salary 48M', i)).toBe('income');
    const b = parseEntry('rent 18M on the 1st next month', T, false); expect(detectType('rent 18M on the 1st next month', b)).toBe('bill');
    expect(categoryOf('250K taxi')).toBe('transport'); expect(categoryOf('Fruit & bread')).toBe('food');
  });
  it('detects key dates, goals, wishes, reminders', () => {
    expect(detectType("Dad's birthday in 55 days", parseEntry("Dad's birthday in 55 days", T, false))).toBe('important');
    expect(detectType('read 20 books', parseEntry('read 20 books', T, false))).toBe('goal');
    expect(detectType('day trip to Kashan someday', parseEntry('day trip to Kashan someday', T, false))).toBe('wish');
    expect(detectType('call mom', parseEntry('call mom', T, false))).toBe('reminder');
    expect(detectType('buy milk', parseEntry('buy milk', T, false))).toBe('task');
  });
  it('empty input is harmless', () => {
    const p = parseEntry('', T, false); expect(p.title).toBe(''); expect(p.day).toBeNull(); expect(p.time).toBeNull();
  });
});

describe('parseEntry — Persian', () => {
  it('"فردا ساعت ۵ دندانپزشکی" → tomorrow, ambiguous 5 → 17:00 default, Persian title digits', () => {
    const p = parseEntry('فردا ساعت ۵ دندانپزشکی', T, true);
    expect(g(p.day!)).toBe('2026-10-7'); expect(p.time).toBe('17:00'); expect(p.ambiguous).toBe(true);
    expect(p.title).toBe('دندانپزشکی'); expect(detectType('فردا ساعت ۵ دندانپزشکی', p)).toBe('event');
  });
  it('morning/evening question flips the hour', () => {
    const p = parseEntry('فردا ساعت ۵ دندانپزشکی', T, true);
    expect(applyMeridiem(p, 'am').parsed.time).toBe('05:00'); expect(applyMeridiem(p, 'pm').parsed.time).toBe('17:00');
  });
  it('explicit part of day', () => {
    expect(parseEntry('پس‌فردا ساعت ۹ صبح زنگ به بیمه', T, true).time).toBe('09:00');
    expect(parseEntry('ساعت ۸ شب شام', T, true).time).toBe('20:00');
    expect(parseEntry('ساعت ۱۴:۳۰ جلسه', T, true).time).toBe('14:30');
  });
  it('Persian digits everywhere', () => {
    expect(g(parseEntry('۳ روز دیگه تمدید', T, true).day!)).toBe('2026-10-9');
    const p = parseEntry('۲۵۰ هزار تومن تاکسی', T, true);
    expect(p.amount).toBe(250000); expect(detectType('۲۵۰ هزار تومن تاکسی', p)).toBe('expense'); expect(p.title).toBe('تاکسی');
    expect(parseEntry('حقوق ۴۸ میلیون', T, true).amount).toBe(48000000);
  });
  it('Jalali month names pick the next occurrence', () => {
    const p = parseEntry('۹ آذر تولد بابا', T, true); const j = toJ(p.day!);
    expect([j.jy, j.jm, j.jd]).toEqual([1405, 9, 9]); expect(detectType('۹ آذر تولد بابا', p)).toBe('important');
    const past = toJ(parseEntry('۱ مهر چیزی', T, true).day!); expect(past.jy).toBe(1406);
  });
  it('"N ماه بعد" and weekdays', () => {
    const j = toJ(parseEntry('۲۵ ماه بعد تمدید بیمه', T, true).day!); expect([j.jm, j.jd]).toEqual([8, 25]);
    expect(g(parseEntry('جمعه کوه', T, true).day!)).toBe('2026-10-9');
  });
  it('detects wish / goal / reminder in Persian', () => {
    expect(detectType('یه روز برم کاشان', parseEntry('یه روز برم کاشان', T, true))).toBe('wish');
    expect(detectType('خواندن ۲۰ کتاب', parseEntry('خواندن ۲۰ کتاب', T, true))).toBe('goal');
    expect(detectType('زنگ به دکتر', parseEntry('زنگ به دکتر', T, true))).toBe('reminder');
  });
});
