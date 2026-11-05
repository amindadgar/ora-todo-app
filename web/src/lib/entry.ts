import type { Day } from './calendar';
import { categoryOf, type EntryType } from './parser';

export type EntryCollection = 'items' | 'events' | 'wishes' | 'bills' | 'savings' | 'goals';
export interface BuiltEntry { collection: EntryCollection; record: { id: string } & Record<string, unknown>; prepend: boolean }

/** Which entry types carry a clock time / have no date. Shared by the app's Add sheet and the Telegram bot. */
export const TYPE_HAS_TIME: EntryType[] = ['task', 'event', 'reminder'];
export const TYPE_NO_DATE: EntryType[] = ['wish', 'goal', 'saving'];
export const TYPE_IS_MONEY: EntryType[] = ['expense', 'income', 'bill', 'saving'];

/**
 * Turn an understood entry into the record that gets stored (and synced).
 * Pure: the caller supplies the id, the day and the localized "New idea" label.
 */
export function buildEntry(o: { type: EntryType; id: string; title: string; day: Day; time: string | null; amount: number | null; target: string | null; rawText: string; newIdeaLabel: string }): BuiltEntry {
  const { type, id, title, day } = o;
  if (type === 'wish') return { collection: 'wishes', record: { id, title, meta: o.newIdeaLabel }, prepend: true };
  if (type === 'important') return { collection: 'events', record: { id, title, day, yearly: true }, prepend: false };
  if (type === 'bill') return { collection: 'bills', record: { id, title, day, amount: o.amount || 0 }, prepend: false };
  if (type === 'saving') return { collection: 'savings', record: { id, title, have: 0, target: o.amount || 1000000 }, prepend: false };
  if (type === 'goal') return { collection: 'goals', record: { id, title, have: 0, target: +(o.target || 1), unit: '' }, prepend: false };
  return {
    collection: 'items', prepend: false,
    record: { id, type, title, day, time: TYPE_HAS_TIME.includes(type) ? o.time || '' : '', ...(o.amount ? { amount: o.amount } : {}), ...(type === 'expense' ? { cat: categoryOf(o.rawText) } : {}) }
  };
}
