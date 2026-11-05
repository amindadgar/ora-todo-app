export function validTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || tz.length > 64) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; }
}
/** The wall-clock date (YYYY-MM-DD) and minutes-since-midnight in a time zone. */
export function localParts(now: Date, tz: string): { date: string; minutes: number } {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: +p.hour! * 60 + +p.minute! };
}
/** Delivery windows (local time). A missed cron tick still delivers later in the window, but a morning brief never arrives at night. */
export const WINDOWS = { morning: [7 * 60 + 30, 12 * 60], evening: [22 * 60, 24 * 60] } as const;
export const inWindow = (kind: keyof typeof WINDOWS, minutes: number) => minutes >= WINDOWS[kind][0] && minutes < WINDOWS[kind][1];
