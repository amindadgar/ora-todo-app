import { dayFromG, type Day } from '../../web/src/lib/calendar';
import { parseEntry, applyMeridiem, detectType, categoryOf } from '../../web/src/lib/parser';
import { buildEntry, TYPE_HAS_TIME, TYPE_IS_MONEY, TYPE_NO_DATE } from '../../web/src/lib/entry';
import { toLatinDigits } from '../../web/src/lib/digits';
import { dicts } from '../../web/src/i18n/dict';
import { makeFormat } from '../../web/src/i18n/format';
import { OraError, type Ora, type Lang, type Due } from './ora';
import { TelegramError, type Telegram, type Keyboard } from './telegram';

export interface Deps { ora: Ora; tg: Telegram; now: () => Date; uid: () => string }
export interface Update {
  message?: { message_id: number; text?: string; chat: { id: number; type: string } };
  callback_query?: { id: string; data?: string; message?: { message_id: number; chat: { id: number; type: string } } };
}

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

// ---------- bot copy (EN / FA). Persian is hand-written; have a native speaker review it. ----------
const M = {
  en: {
    needLink: 'Open <b>Ora → Settings → Connect Telegram</b> to link this chat to your account first.',
    badCode: 'That link expired or was already used. Create a new one in <b>Ora → Settings → Connect Telegram</b>.',
    linked: (n: string) => `✅ Connected, ${esc(n)}!\n\nJust type something like <i>“dentist tomorrow 5pm”</i> or <i>“250K taxi”</i> and I’ll save it.\n/today shows your day · /help lists everything.`,
    help: 'Type anything — I pick up the date, time and amount.\n\n/today — your day, tap ✓ to finish a task\n/lang — switch English / فارسی\n/stop — disconnect this chat\n\nMorning brief (7:30) and evening review (22:00) follow the switches in Ora → Settings.',
    noTitle: 'I couldn’t find a title in that. Try “call mum tomorrow 6pm”.',
    saved: 'Saved', undo: '↩ Undo', removed: 'Removed.', gone: 'Disconnected. You can link again any time from Ora → Settings.', langSet: 'Language: English.',
    assumed: (t: string) => `(no am/pm given — I assumed ${t})`, today: 'Today', nothing: 'Nothing planned for today.', done: 'Done 🎉', alreadyDone: 'Already done',
    morning: (n: number) => (n ? `☀️ <b>Good morning!</b> You have ${n} thing${n === 1 ? '' : 's'} today:` : '☀️ <b>Good morning!</b> Nothing planned today — start with something small.'),
    evening: (d: number, t: number) => (t ? `🌙 <b>Evening review</b> — you finished ${d} of ${t} today.${d === t ? ' Well done!' : ''}` : '🌙 <b>Evening review</b> — nothing was planned today.'),
    left: 'Still open:', err: 'Something went wrong. Please try again in a moment.', unknown: 'I didn’t understand that command. /help'
  },
  fa: {
    needLink: 'اول از <b>Ora ← تنظیمات ← اتصال تلگرام</b> این گفتگو را به حسابت وصل کن.',
    badCode: 'این لینک منقضی شده یا قبلاً استفاده شده. یکی تازه بساز: <b>Ora ← تنظیمات ← اتصال تلگرام</b>.',
    linked: (n: string) => `✅ وصل شدی، ${esc(n)}!\n\nفقط بنویس مثلاً <i>«دندانپزشکی فردا ساعت ۵»</i> یا <i>«۲۵۰ هزار تاکسی»</i> تا ذخیره کنم.\n/today روزت را نشان می‌دهد · /help راهنما.`,
    help: 'هرچی هست عادی بنویس؛ تاریخ، ساعت و مبلغ را خودم می‌فهمم.\n\n/today — روز تو؛ برای انجام‌شدن ✓ را بزن\n/lang — تغییر زبان English / فارسی\n/stop — قطع اتصال این گفتگو\n\nخلاصهٔ صبح (۰۷:۳۰) و مرور شب (۲۲:۰۰) با کلیدهای Ora ← تنظیمات کنترل می‌شن.',
    noTitle: 'عنوانی پیدا نکردم. مثلاً بنویس «زنگ به مامان فردا ساعت ۶ عصر».',
    saved: 'ذخیره شد', undo: '↩ برگردان', removed: 'حذف شد.', gone: 'اتصال قطع شد. هر وقت خواستی از Ora ← تنظیمات دوباره وصل کن.', langSet: 'زبان: فارسی.',
    assumed: (t: string) => `(صبح یا عصر نگفتی — ${t} در نظر گرفتم)`, today: 'امروز', nothing: 'برای امروز برنامه‌ای نداری.', done: 'انجام شد 🎉', alreadyDone: 'قبلاً انجام شده',
    morning: (n: number) => (n ? `☀️ <b>صبح بخیر!</b> امروز ${n} کار داری:` : '☀️ <b>صبح بخیر!</b> برای امروز چیزی ثبت نشده؛ با یه کار کوچیک شروع کن.'),
    evening: (d: number, t: number) => (t ? `🌙 <b>مرور شب</b> — امروز ${d} از ${t} کار را انجام دادی.${d === t ? ' آفرین!' : ''}` : '🌙 <b>مرور شب</b> — برای امروز کاری ثبت نشده بود.'),
    left: 'هنوز مانده:', err: 'مشکلی پیش آمد. کمی بعد دوباره امتحان کن.', unknown: 'این دستور را نفهمیدم. /help'
  }
} as const;

/** The user's "today" (as a day number) in their time zone. */
export function todayIn(now: Date, tz: string): { day: Day; minutes: number; date: string } {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map((x) => [x.type, x.value]));
  return { day: dayFromG(+p.year!, +p.month!, +p.day!), minutes: +p.hour! * 60 + +p.minute!, date: `${p.year}-${p.month}-${p.day}` };
}
const bucketOf = (min: number) => (min < 12 * 60 ? 0 : min < 16 * 60 ? 1 : min < 20 * 60 ? 2 : 3);   // same buckets as the app's activity chart

interface TodayItem { id: string; title: string; time: string; done: boolean; type: string }
async function todaysItems(d: Deps, chatId: number, day: Day, f: ReturnType<typeof makeFormat>): Promise<TodayItem[]> {
  const recs = await d.ora.records(chatId, 'items');
  return recs.map((r) => r.data as { id: string; type: string; title: unknown; day: number; time?: string; done?: boolean })
    .filter((x) => x.day === day && (x.type === 'task' || x.type === 'event' || x.type === 'reminder'))
    .map((x) => ({ id: x.id, type: x.type, title: f.text(x.title as never), time: x.time ?? '', done: !!x.done }))
    .sort((a, b) => ((a.time || '99') < (b.time || '99') ? -1 : 1));
}
const line = (i: TodayItem, f: ReturnType<typeof makeFormat>) => `${i.done ? '✅' : '⬜'} ${esc(i.title)}${i.time ? ` — ${f.time(i.time)}` : ''}`;
const doneKeyboard = (items: TodayItem[]): Keyboard => items.filter((i) => !i.done && i.type !== 'reminder').slice(0, 20).map((i) => [{ text: `✓ ${clip(i.title, 40)}`, callback_data: `d:${i.id}` }]);

async function renderToday(d: Deps, chatId: number, lang: Lang, tz: string) {
  const f = makeFormat(lang), T = todayIn(d.now(), tz), t = M[lang], items = await todaysItems(d, chatId, T.day, f);
  const head = `<b>${t.today}</b> — ${esc(f.fullLabel(T.day))}`;
  return { text: items.length ? `${head}\n\n${items.map((i) => line(i, f)).join('\n')}` : `${head}\n\n${t.nothing}`, keyboard: doneKeyboard(items) };
}

// ---------- entry points ----------
export async function handleUpdate(u: Update, d: Deps): Promise<void> {
  const chat = u.message?.chat ?? u.callback_query?.message?.chat;
  if (!chat || chat.type !== 'private') return;                                  // only 1:1 chats
  try {
    if (u.callback_query) await onCallback(u.callback_query, chat.id, d); else if (u.message?.text) await onText(u.message.text.trim(), chat.id, d);
  } catch (e) {
    console.error('bot error', e);
    try { const me = await d.ora.me(chat.id).catch(() => null); await d.tg.send(chat.id, M[me?.lang ?? 'en'].err); } catch { /* chat unreachable */ }
  }
}

async function onText(text: string, chatId: number, d: Deps) {
  if (text.startsWith('/')) return onCommand(text, chatId, d);
  const me = await d.ora.me(chatId); if (!me) return void (await d.tg.send(chatId, M.en.needLink + '\n\n' + M.fa.needLink));
  const lang = me.lang, t = M[lang], dict = dicts[lang], fa = lang === 'fa', T = todayIn(d.now(), me.tz);
  const raw = parseEntry(text, T.day, fa); const { parsed: P, chosen } = applyMeridiem(raw, null); const type = detectType(text, raw);
  if (!P.title) return void (await d.tg.send(chatId, t.noTitle));
  const settings = (await d.ora.records(chatId, 'settings', 'main'))[0]?.data as { currency?: 'toman' | 'rial' } | undefined;
  const f = makeFormat(lang, settings?.currency === 'rial' ? 'rial' : 'toman');
  const day = raw.day ?? T.day, target = (toLatinDigits(text).match(/\d+/) || [null])[0];
  const e = buildEntry({ type, id: d.uid(), title: P.title, day, time: P.time, amount: P.amount, target, rawText: text, newIdeaLabel: dict.newIdea });
  await d.ora.changes(chatId, [{ collection: e.collection, id: e.record.id, data: e.record, updatedAt: d.now().toISOString() }]);

  const hasTime = TYPE_HAS_TIME.includes(type), noDate = TYPE_NO_DATE.includes(type), money = TYPE_IS_MONEY.includes(type);
  const rows = [`✅ ${t.saved}: <b>${esc(P.title)}</b>`, `<i>${esc(dict.types[type])}</i>`];
  if (!noDate) rows.push(`📅 ${esc((day === T.day ? dict.todayComma : day === T.day + 1 ? dict.tomorrowComma : '') + f.fullLabel(day))}`);
  if (hasTime && P.time) rows.push(`🕒 ${f.time(P.time)}${raw.ambiguous && chosen ? ` ${esc(t.assumed(`${raw.hour} ${dict[chosen]}`))}` : ''}`);
  if (money && P.amount) rows.push(`💰 ${f.money(P.amount)}`);
  if (type === 'expense') rows.push(`🏷 ${esc(dict.cats[categoryOf(text)])}`);
  if (type === 'goal' && target) rows.push(`🎯 ${esc(dict.target + f.N(target))}`);
  await d.tg.send(chatId, rows.join('\n'), [[{ text: t.undo, callback_data: `u:${e.collection}:${e.record.id}` }]]);
}

async function onCommand(text: string, chatId: number, d: Deps) {
  const [rawCmd = '', ...args] = text.split(/\s+/); const cmd = rawCmd.toLowerCase().replace(/@\w+$/, '');
  if (cmd === '/start') {
    const code = args[0];
    if (code) {
      const r = await d.ora.link(code, chatId);
      return void (await d.tg.send(chatId, r ? M[r.lang].linked(r.name) : M.en.badCode + '\n\n' + M.fa.badCode));
    }
    const me = await d.ora.me(chatId); return void (await d.tg.send(chatId, me ? M[me.lang].help : M.en.needLink + '\n\n' + M.fa.needLink));
  }
  const me = await d.ora.me(chatId); if (!me) return void (await d.tg.send(chatId, M.en.needLink + '\n\n' + M.fa.needLink));
  const t = M[me.lang];
  if (cmd === '/help') return void (await d.tg.send(chatId, t.help));
  if (cmd === '/today') { const v = await renderToday(d, chatId, me.lang, me.tz); return void (await d.tg.send(chatId, v.text, v.keyboard)); }
  if (cmd === '/lang') { const next: Lang = me.lang === 'fa' ? 'en' : 'fa'; await d.ora.setLang(chatId, next); return void (await d.tg.send(chatId, M[next].langSet)); }
  if (cmd === '/stop') { await d.ora.unlink(chatId); return void (await d.tg.send(chatId, t.gone)); }
  await d.tg.send(chatId, t.unknown);
}

async function onCallback(q: NonNullable<Update['callback_query']>, chatId: number, d: Deps) {
  const msgId = q.message?.message_id; const me = await d.ora.me(chatId);
  if (!me || !msgId || !q.data) return void (await d.tg.answer(q.id));
  const t = M[me.lang], [kind, a, b] = q.data.split(':');
  if (kind === 'u' && a && b && /^[a-z]+$/.test(a)) {                           // undo a freshly saved entry
    await d.ora.changes(chatId, [{ collection: a, id: b, deleted: true, updatedAt: d.now().toISOString() }]);
    await d.tg.edit(chatId, msgId, t.removed); return void (await d.tg.answer(q.id));
  }
  if (kind === 'd' && a) {                                                      // mark a task done (+ the activity record behind the Goals charts)
    const T = todayIn(d.now(), me.tz); const [rec] = await d.ora.records(chatId, 'items', a);
    if (!rec) return void (await d.tg.answer(q.id));
    const item = rec.data as { done?: boolean };
    if (item.done) return void (await d.tg.answer(q.id, t.alreadyDone));
    const now = d.now(), bucket = bucketOf(T.minutes);
    const act = (await d.ora.records(chatId, 'activity', String(T.day)))[0]?.data as { b?: number[] } | undefined;
    const b4 = [...(act?.b ?? [0, 0, 0, 0])]; b4[bucket] = (b4[bucket] ?? 0) + 1;
    await d.ora.changes(chatId, [
      { collection: 'items', id: a, data: { ...rec.data, done: true, doneAt: T.day, doneB: bucket }, updatedAt: now.toISOString() },
      { collection: 'activity', id: String(T.day), data: { day: T.day, b: b4 }, updatedAt: now.toISOString() }
    ]);
    const v = await renderToday(d, chatId, me.lang, me.tz); await d.tg.edit(chatId, msgId, v.text, v.keyboard).catch(() => {});
    return void (await d.tg.answer(q.id, t.done));
  }
  await d.tg.answer(q.id);
}

/** Cron tick: send whatever the API says is due, then acknowledge so it isn't sent twice. */
export async function runDue(d: Deps): Promise<{ sent: number; failed: number }> {
  let sent = 0, failed = 0;
  for (const due of await d.ora.due()) {
    try { await sendDue(due, d); await d.ora.ack(due); sent++; }
    catch (e) {
      failed++; console.error('due failed', due.kind, e);
      if (e instanceof TelegramError && e.blocked) await d.ora.unlink(due.chatId).catch(() => {});   // the user blocked the bot → stop trying
      else if (e instanceof OraError && e.status === 404) { /* unlinked meanwhile */ }
    }
  }
  return { sent, failed };
}
async function sendDue(due: Due, d: Deps) {
  const f = makeFormat(due.lang), t = M[due.lang], T = todayIn(d.now(), due.tz), items = (await todaysItems(d, due.chatId, T.day, f));
  if (due.kind === 'morning') {
    const text = [t.morning(items.length), ...(items.length ? ['', ...items.map((i) => line(i, f))] : [])].join('\n');
    return void (await d.tg.send(due.chatId, text, doneKeyboard(items)));
  }
  const tasks = items.filter((i) => i.type !== 'reminder'), done = tasks.filter((i) => i.done).length, open = tasks.filter((i) => !i.done);
  const text = [t.evening(done, tasks.length), ...(open.length ? ['', t.left, ...open.map((i) => line(i, f))] : [])].join('\n');
  await d.tg.send(due.chatId, text, doneKeyboard(items));
}
