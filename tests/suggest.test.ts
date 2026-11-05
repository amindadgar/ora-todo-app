import { describe, it, expect } from 'vitest';
import { nextFreeSlot, toHM } from '../src/lib/suggest';
import type { Item } from '../src/data/types';
const it_ = (time: string, extra: Partial<Item> = {}): Item => ({ id: time, type: 'task', title: 'x', day: 10, time, ...extra });
describe('nextFreeSlot', () => {
  it('free evening → 17:00–20:00 (3h cap)', () => { expect(nextFreeSlot([it_('10:00')], 10)).toEqual([1020, 1200]); expect(toHM(1200)).toBe('20:00'); });
  it('21:00 task still yields 17:00–20:00', () => { expect(nextFreeSlot([it_('21:00')], 10)).toEqual([1020, 1200]); });
  it('a task at 17:30 pushes the slot to 18:30', () => { expect(nextFreeSlot([it_('17:30')], 10)?.[0]).toBe(17 * 60 + 30 + 60); });
  it('ignores done items, money and other days', () => { expect(nextFreeSlot([it_('17:30', { done: true }), it_('18:00', { type: 'expense' }), it_('19:00', { day: 11 })], 10)).toEqual([1020, 1200]); });
  it('no room → null', () => { expect(nextFreeSlot([it_('17:00'), it_('18:00'), it_('19:00'), it_('20:00'), it_('21:00')], 10)).toBeNull(); });
});
