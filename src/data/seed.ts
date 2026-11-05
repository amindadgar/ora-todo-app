import { Day, toJ, dayFromJ } from '../lib/calendar';
import type { Collections } from './types';

/** Sample data (same content as the prototype), generated relative to `today`. */
export function makeSeed(today: Day): Collections {
  const tj = toJ(today), monthStart = dayFromJ(tj.jy, tj.jm, 1), sinceStart = today - monthStart;
  // money samples live inside the current Jalali month so Money is never empty
  const at = (k: number) => monthStart + Math.min(sinceStart, k);
  return {
    items: [
      { id: 'a', type: 'task', title: { fa: 'آماده‌کردن ارائهٔ پنجشنبه', en: 'Prep Thursday’s presentation' }, day: today, time: '14:00', urgent: true },
      { id: 'b', type: 'task', title: { fa: 'خواندن ۲۰ صفحه کتاب', en: 'Read 20 pages' }, day: today, time: '21:00' },
      { id: 'c', type: 'task', title: { fa: 'رزرو بلیت تئاتر', en: 'Book theatre tickets' }, day: today, time: '' },
      { id: 'd', type: 'task', title: { fa: 'پیاده‌روی صبحگاهی', en: 'Morning walk' }, day: today, time: '07:00' },
      { id: 'e', type: 'task', title: { fa: 'ارسال گزارش ماهانه', en: 'Send monthly report' }, day: today, time: '10:00', urgent: true },
      { id: 'f', type: 'reminder', title: { fa: 'جلسهٔ تیم', en: 'Team sync' }, day: today, time: '15:30' },
      { id: 'g', type: 'event', title: { fa: 'دندانپزشکی', en: 'Dentist' }, day: today + 1, time: '17:00' },
      { id: 'h', type: 'reminder', title: { fa: 'خرید کادو برای سارا', en: 'Buy Sara a gift' }, day: today + 2, time: '' },
      { id: 'i', type: 'event', title: { fa: 'شام با دوستان', en: 'Dinner with friends' }, day: today - 8, time: '20:00' },
      { id: 'j', type: 'event', title: { fa: 'کوه‌پیمایی', en: 'Hiking' }, day: today - 4, time: '07:00' },
      { id: 't1', type: 'income', title: { fa: 'حقوق ماه', en: 'Salary' }, day: at(0), time: '', amount: 48500000 },
      { id: 't2', type: 'expense', cat: 'home', title: { fa: 'اجارهٔ ماه', en: 'Rent' }, day: at(0), time: '', amount: 18000000 },
      { id: 't3', type: 'expense', cat: 'food', title: { fa: 'خرید سوپرمارکت', en: 'Groceries' }, day: at(3), time: '', amount: 3200000 },
      { id: 't4', type: 'expense', cat: 'transport', title: { fa: 'اسنپ', en: 'Ride-hailing' }, day: at(4), time: '', amount: 1300000 },
      { id: 't5', type: 'expense', cat: 'fun', title: { fa: 'بلیت کنسرت', en: 'Concert tickets' }, day: at(6), time: '', amount: 2200000 },
      { id: 't6', type: 'expense', cat: 'food', title: { fa: 'رستوران', en: 'Restaurant' }, day: at(7), time: '', amount: 1400000 },
      { id: 't7', type: 'expense', cat: 'bills', title: { fa: 'قبض برق و گاز', en: 'Power & gas bill' }, day: at(8), time: '', amount: 1200000 },
      { id: 't8', type: 'expense', cat: 'fun', title: { fa: 'سینما', en: 'Cinema' }, day: at(9), time: '', amount: 1200000 },
      { id: 't9', type: 'expense', cat: 'transport', title: { fa: 'بنزین', en: 'Fuel' }, day: at(10), time: '', amount: 800000 },
      { id: 't10', type: 'expense', cat: 'food', title: { fa: 'میوه و نان', en: 'Fruit & bread' }, day: at(11), time: '', amount: 1400000 },
      { id: 't11', type: 'expense', cat: 'other', title: { fa: 'کادو', en: 'Gift' }, day: at(12), time: '', amount: 500000 }
    ],
    events: [
      { id: 'e1', title: { fa: 'تولد سارا', en: 'Sara’s birthday' }, day: today + 3, yearly: true },
      { id: 'e2', title: { fa: 'مهلت ثبت‌نام آزمون زبان', en: 'Language exam deadline' }, day: today + 11, yearly: false },
      { id: 'e3', title: { fa: 'سالگرد ازدواج', en: 'Wedding anniversary' }, day: today + 18, yearly: true },
      { id: 'e4', title: { fa: 'تولد بابا', en: 'Dad’s birthday' }, day: today + 55, yearly: true },
      { id: 'e5', title: { fa: 'شب یلدا', en: 'Yalda night' }, day: today + 76, yearly: true },
      { id: 'e6', title: { fa: 'نوروز ۱۴۰۶', en: 'Nowruz 1406' }, day: today + 166, yearly: true }
    ],
    wishes: [
      { id: 'w1', title: { fa: 'دوچرخه‌سواری در پارک', en: 'Bike ride in the park' }, meta: { fa: '۹۰ دقیقه، انرژی متوسط، رایگان، فضای باز', en: '90 min · Medium energy · Free · Outdoor' } },
      { id: 'w2', title: { fa: 'کافه و کتاب', en: 'Café and a book' }, meta: { fa: '۲ ساعت، انرژی کم، هزینهٔ کم، تنها', en: '2 h · Low energy · Low cost · Alone' } },
      { id: 'w3', title: { fa: 'کوه‌پیمایی درکه', en: 'Hike in Darakeh' }, meta: { fa: 'نصف روز، انرژی زیاد، رایگان، با دوستان', en: 'Half day · High energy · Free · With friends' } },
      { id: 'w4', title: { fa: 'موزهٔ هنرهای معاصر', en: 'Contemporary art museum' }, meta: { fa: '۳ ساعت، انرژی کم، هزینهٔ کم، تنها', en: '3 h · Low energy · Low cost · Alone' } },
      { id: 'w5', title: { fa: 'سفر یک‌روزه به کاشان', en: 'Day trip to Kashan' }, meta: { fa: 'تمام روز، انرژی زیاد، هزینهٔ زیاد، با دوستان', en: 'Full day · High energy · High cost · With friends' } }
    ],
    bills: [
      { id: 'b1', title: { fa: 'قسط وام', en: 'Loan installment' }, day: today + 6, amount: 4200000 },
      { id: 'b2', title: { fa: 'اینترنت', en: 'Internet' }, day: today + 11, amount: 450000 },
      { id: 'b3', title: { fa: 'اجارهٔ خانه', en: 'Rent' }, day: today + 17, amount: 18000000 }
    ],
    savings: [
      { id: 's1', title: { fa: 'صندوق اضطراری', en: 'Emergency fund' }, have: 32000000, target: 50000000 },
      { id: 's2', title: { fa: 'سفر نوروزی', en: 'Nowruz trip' }, have: 12000000, target: 30000000 }
    ],
    goals: [
      { id: 'g1', title: { fa: 'خواندن ۲۰ کتاب', en: 'Read 20 books' }, have: 13, target: 20, unit: { fa: 'کتاب', en: 'books' } },
      { id: 'g2', title: { fa: '۱۰۰ جلسه ورزش', en: '100 workouts' }, have: 68, target: 100, unit: { fa: 'جلسه', en: 'sessions' } },
      { id: 'g3', title: { fa: 'یادگرفتن ۵۰۰ واژهٔ آلمانی', en: 'Learn 500 German words' }, have: 340, target: 500, unit: { fa: 'واژه', en: 'words' } }
    ]
  };
}
export const emptyCollections = (): Collections => ({ items: [], events: [], wishes: [], bills: [], savings: [], goals: [] });
