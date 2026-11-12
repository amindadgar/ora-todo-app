import { describe, it, expect } from 'vitest';
import { canon, toRecords, keyOf } from '../src/data/sync';
import { DEFAULT_SETTINGS } from '../src/data/types';

describe('canon', () => {
  it('ignores key order (Postgres jsonb reorders keys) and undefined values', () => {
    expect(canon({ b: 1, a: { d: [1, { y: 2, x: 1 }], c: null } })).toBe(canon({ a: { c: null, d: [1, { x: 1, y: 2 }] }, b: 1 }));
    expect(canon({ a: 1, gone: undefined })).toBe(canon({ a: 1 }));
  });
  it('still distinguishes real differences', () => {
    expect(canon({ a: 1 })).not.toBe(canon({ a: 2 })); expect(canon([1, 2])).not.toBe(canon([2, 1])); expect(canon({ a: null })).not.toBe(canon({}));
  });
});
describe('toRecords', () => {
  it('maps every collection to keyed records, activity by day, and syncs only shared settings', () => {
    const m = toRecords({ items: [{ id: 'a', type: 'task', title: 'x', day: 1, time: '' }], events: [], wishes: [], bills: [], savings: [], goals: [], activity: [{ day: 2461000, b: [1, 0, 0, 0] }], settings: { ...DEFAULT_SETTINGS, lang: 'en', theme: 'dark', currency: 'rial' } });
    expect([...m.keys()].sort()).toEqual([keyOf('activity', '2461000'), keyOf('items', 'a'), keyOf('settings', 'main')]);
    expect(m.get('settings/main')!.data).toEqual({ currency: 'rial', calMode: null, showAlt: true, morning: true, evening: true, remindDefault: 10 });   // no lang/theme
  });
});
