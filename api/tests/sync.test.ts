import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setup, teardown, client, change, ORIGIN, type Ctx } from './helpers.js';

let c: Ctx; beforeAll(async () => { c = await setup({ MAX_RECORDS_PER_USER: '100' }); }); afterAll(() => teardown(c));
beforeEach(async () => { await c.db.query('truncate users, sessions, records cascade'); });
const T0 = '2026-10-06T10:00:00.000Z', T1 = '2026-10-06T10:05:00.000Z', T2 = '2026-10-06T10:10:00.000Z';
const push = (a: ReturnType<typeof client>, ...changes: object[]) => a.post('/v1/sync', { changes });

describe('push / pull', () => {
  it('round-trips records and returns a cursor', async () => {
    const a = client(c.app); await a.login();
    const r = await push(a, change('t1', { title: 'Walk', day: 1 }, T0), change('s', { currency: 'rial' }, T0, 'settings'), change('2461000', { day: 2461000, b: [1, 2, 3, 4] }, T0, 'activity'));
    expect(r.statusCode).toBe(200); expect(r.json()).toMatchObject({ applied: 3, rejected: [] }); expect(r.json().cursor).toBeGreaterThan(0);
    const p = (await a.get('/v1/sync?since=0')).json();
    expect(p.records).toHaveLength(3); expect(p.hasMore).toBe(false); expect(p.cursor).toBe(r.json().cursor);
    expect(p.records.find((x: { id: string }) => x.id === 't1')).toMatchObject({ collection: 'items', data: { title: 'Walk', day: 1 }, deleted: false, updatedAt: T0 });
    expect((await a.get(`/v1/sync?since=${p.cursor}`)).json().records).toEqual([]);
  });
  it('only returns what changed since the cursor', async () => {
    const a = client(c.app); await a.login(); const first = (await push(a, change('a', { n: 1 }, T0))).json().cursor;
    await push(a, change('b', { n: 2 }, T0), change('a', { n: 3 }, T1));
    const p = (await a.get(`/v1/sync?since=${first}`)).json(); expect(p.records.map((r: { id: string }) => r.id).sort()).toEqual(['a', 'b']);
    expect(p.records.find((r: { id: string }) => r.id === 'a').data).toEqual({ n: 3 });
  });
  it('paginates', async () => {
    const a = client(c.app); await a.login(); await push(a, ...Array.from({ length: 12 }, (_, i) => change('r' + i, { i }, T0)));
    const p1 = (await a.get('/v1/sync?since=0&limit=5')).json(); expect(p1.records).toHaveLength(5); expect(p1.hasMore).toBe(true);
    const p2 = (await a.get(`/v1/sync?since=${p1.cursor}&limit=5`)).json(); const p3 = (await a.get(`/v1/sync?since=${p2.cursor}&limit=5`)).json();
    expect(p2.records).toHaveLength(5); expect(p3.records).toHaveLength(2); expect(p3.hasMore).toBe(false);
    expect(new Set([...p1.records, ...p2.records, ...p3.records].map((r: { id: string }) => r.id)).size).toBe(12);
  });
  it('re-pushing the same change is idempotent', async () => {
    const a = client(c.app); await a.login(); await push(a, change('x', { v: 1 }, T0)); const again = (await push(a, change('x', { v: 1 }, T0))).json();
    expect(again.applied).toBe(0); expect(again.rejected[0]).toMatchObject({ id: 'x', data: { v: 1 } });
  });
});

describe('conflicts (last write wins by updatedAt)', () => {
  it('a newer edit replaces an older one; an older edit is rejected with the server copy', async () => {
    const a = client(c.app); await a.login(); await push(a, change('x', { v: 'old' }, T0));
    expect((await push(a, change('x', { v: 'new' }, T2))).json().applied).toBe(1);
    const late = (await push(a, change('x', { v: 'stale' }, T1))).json(); expect(late.applied).toBe(0); expect(late.rejected[0]).toMatchObject({ data: { v: 'new' }, updatedAt: T2 });
    expect((await a.get('/v1/sync?since=0')).json().records[0].data).toEqual({ v: 'new' });
  });
  it('deletes are tombstones that sync and lose to newer edits', async () => {
    const a = client(c.app); await a.login(); await push(a, change('x', { v: 1 }, T0)); const cur = (await push(a, change('x', {}, T1, 'items', true))).json().cursor;
    const t = (await a.get(`/v1/sync?since=0`)).json().records[0]; expect(t).toMatchObject({ deleted: true, data: null });
    expect((await a.get(`/v1/sync?since=${cur}`)).json().records).toEqual([]);
    expect((await push(a, change('x', { v: 'revived' }, T2))).json().applied).toBe(1);
    expect((await push(a, change('x', {}, T1, 'items', true))).json().applied).toBe(0);                 // an older delete can't kill a newer edit
  });
  it('clamps timestamps from the future so a fast clock cannot win forever', async () => {
    const a = client(c.app); await a.login(); await push(a, change('x', { v: 'future' }, '2099-01-01T00:00:00.000Z'));
    const rec = (await a.get('/v1/sync?since=0')).json().records[0]; expect(Date.parse(rec.updatedAt)).toBeLessThan(Date.now() + 120_000);
    expect((await push(a, change('x', { v: 'real' }, new Date(Date.now() + 300_000).toISOString()))).json().applied).toBe(1);
  });
});

describe('isolation', () => {
  it('users never see each other\'s records, even with the same ids', async () => {
    const a = client(c.app), b = client(c.app); await a.login('a'); await b.login('b');
    await push(a, change('same', { owner: 'a' }, T0)); await push(b, change('same', { owner: 'b' }, T0), change('only-b', { z: 1 }, T0));
    expect((await a.get('/v1/sync')).json().records.map((r: { data: { owner?: string } }) => r.data.owner)).toEqual(['a']);
    const bs = (await b.get('/v1/sync')).json().records; expect(bs).toHaveLength(2); expect(bs.find((r: { id: string }) => r.id === 'same').data.owner).toBe('b');
  });
  it('two devices of one account converge', async () => {
    const d1 = client(c.app), d2 = client(c.app); await d1.login('same'); await d2.login('same');
    await push(d1, change('t', { by: 'phone' }, T0)); const got = (await d2.get('/v1/sync')).json(); expect(got.records[0].data.by).toBe('phone');
    await push(d2, change('t', { by: 'laptop' }, T1)); expect((await d1.get(`/v1/sync?since=${got.cursor}`)).json().records[0].data.by).toBe('laptop');
  });
  it('concurrent pushes from one user are serialized (no lost or duplicate revs)', async () => {
    const a = client(c.app); await a.login(); await Promise.all(Array.from({ length: 8 }, (_, i) => push(a, change('c' + i, { i }, T0), change('d' + i, { i }, T0))));
    const { records } = (await a.get('/v1/sync?since=0&limit=500')).json(); expect(records).toHaveLength(16); expect(new Set(records.map((r: { rev: number }) => r.rev)).size).toBe(16);
  });
});

describe('validation & limits', () => {
  it('rejects malformed pushes', async () => {
    const a = client(c.app); await a.login();
    for (const bad of [
      { collection: 'nope', id: 'x', data: {}, updatedAt: T0 }, { collection: 'items', id: '', data: {}, updatedAt: T0 }, { collection: 'items', id: 'a b', data: {}, updatedAt: T0 },
      { collection: 'items', id: 'x', data: {}, updatedAt: 'yesterday' }, { collection: 'items', id: 'x', updatedAt: T0 }, { collection: 'items', id: 'x', data: 'str', updatedAt: T0 },
      { collection: 'items', id: 'x', data: { big: 'x'.repeat(20000) }, updatedAt: T0 }
    ]) expect((await push(a, bad)).statusCode, JSON.stringify(bad).slice(0, 60)).toBe(400);
    expect((await a.post('/v1/sync', { changes: Array.from({ length: 201 }, (_, i) => change('m' + i, {}, T0)) })).statusCode).toBe(400);
    expect((await a.get('/v1/sync?since=-1')).statusCode).toBe(400); expect((await a.get('/v1/sync?limit=9999')).statusCode).toBe(400);
  });
  it('caps record growth per user but still allows updating existing records', async () => {
    const a = client(c.app); await a.login();
    expect((await push(a, ...Array.from({ length: 60 }, (_, j) => change(`k${j}`, { j }, T0)))).statusCode).toBe(200);
    const r = await push(a, ...Array.from({ length: 60 }, (_, j) => change(`z${j}`, { j }, T0))); expect(r.statusCode).toBe(413); expect(r.json().error).toBe('too_many_records');
    expect((await push(a, ...Array.from({ length: 40 }, (_, j) => change(`n${j}`, { j }, T0)))).statusCode).toBe(200);   // exactly 100
    expect((await push(a, change('over', {}, T0))).statusCode).toBe(413);
    expect((await push(a, ...Array.from({ length: 60 }, (_, j) => change(`k${j}`, { j: 'edited' }, T1)))).json().applied).toBe(60);   // updates at the cap are fine
  });
  it('a failed push does not partially apply', async () => {
    const a = client(c.app); await a.login(); const before = (await a.get('/v1/sync')).json().records.length;
    await push(a, change('ok1', {}, T0), { collection: 'items', id: 'bad', updatedAt: T0 }); expect((await a.get('/v1/sync')).json().records.length).toBe(before);
  });
});

describe('account deletion', () => {
  it('removes the user, sessions and all records', async () => {
    const a = client(c.app); await a.login('gone'); await push(a, change('x', {}, T0)); const keep = client(c.app); await keep.login('stay'); await push(keep, change('y', {}, T0));
    expect((await a.del('/v1/account')).statusCode).toBe(204);
    expect((await a.get('/auth/me')).statusCode).toBe(401);
    expect((await c.db.query(`select count(*)::int n from records`)).rows[0].n).toBe(1); expect((await c.db.query(`select count(*)::int n from users`)).rows[0].n).toBe(1);
    expect((await keep.get('/v1/sync')).json().records).toHaveLength(1);
  });
  it('requires the allowed origin', async () => {
    const a = client(c.app); await a.login(); const r = await c.app.inject({ method: 'DELETE', url: '/v1/account', headers: { cookie: a.cookie, origin: 'https://evil.example' } }); expect(r.statusCode).toBe(403); expect(ORIGIN).toBeTruthy();
  });
});
