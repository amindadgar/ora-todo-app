import { describe, it, expect } from 'vitest';
import { buildEntry } from '../src/lib/entry';

const base = { id: 'x', title: 'Thing', day: 100, time: null, amount: null, target: null, rawText: 'Thing', newIdeaLabel: 'New idea' };
describe('buildEntry', () => {
  it('tasks/events/reminders go to items with a time (or empty)', () => {
    expect(buildEntry({ ...base, type: 'event', time: '17:00' })).toMatchObject({ collection: 'items', record: { type: 'event', time: '17:00', day: 100 } });
    expect(buildEntry({ ...base, type: 'task' }).record.time).toBe('');
    expect(buildEntry({ ...base, type: 'task', time: '09:00' }).record.time).toBe('09:00');
  });
  it('expenses get a category and an amount; income does not', () => {
    const e = buildEntry({ ...base, type: 'expense', title: 'taxi', rawText: '250K taxi', amount: 250000 }).record; expect(e).toMatchObject({ amount: 250000, cat: 'transport', time: '' });
    expect(buildEntry({ ...base, type: 'income', amount: 48000000 }).record).toMatchObject({ amount: 48000000 }); expect('cat' in buildEntry({ ...base, type: 'income', amount: 1 }).record).toBe(false);
  });
  it('maps the other types to their collections', () => {
    expect(buildEntry({ ...base, type: 'important' })).toMatchObject({ collection: 'events', record: { yearly: true } });
    expect(buildEntry({ ...base, type: 'bill', amount: 5 })).toMatchObject({ collection: 'bills', record: { amount: 5 } });
    expect(buildEntry({ ...base, type: 'saving' })).toMatchObject({ collection: 'savings', record: { have: 0, target: 1000000 } });
    expect(buildEntry({ ...base, type: 'goal', target: '20' })).toMatchObject({ collection: 'goals', record: { target: 20, have: 0 } });
    expect(buildEntry({ ...base, type: 'goal' }).record.target).toBe(1);
    const w = buildEntry({ ...base, type: 'wish' }); expect(w).toMatchObject({ collection: 'wishes', prepend: true, record: { meta: 'New idea' } });
  });
});

import { buildEntry as be } from '../src/lib/entry';
describe('reminders on built entries', () => {
  const base = { id: 'x', title: 'T', day: 1, amount: null, target: null, rawText: 'T', newIdeaLabel: 'n' };
  it('adds the default lead time only to timed items', () => {
    expect(be({ ...base, type: 'task', time: '16:00', remind: 10 }).record).toMatchObject({ remind: 10 });
    expect(be({ ...base, type: 'task', time: null, remind: 10 }).record).not.toHaveProperty('remind');
    expect(be({ ...base, type: 'task', time: '16:00', remind: 0 }).record).not.toHaveProperty('remind');
    expect(be({ ...base, type: 'expense', time: '16:00', remind: 10 }).record).not.toHaveProperty('remind');
  });
});
