import { create } from 'zustand';
import { useData, currentNamespace } from './store';
import { api, ApiError } from './api';
import type { Activity, Collections, Settings } from './types';

/**
 * Offline-first sync for signed-in accounts. The app always reads/writes the local store; this engine
 * diffs it against what was last synced and exchanges changes with the API:
 *   push  → local edits/deletes since last sync (last-write-wins per record, decided by the server)
 *   pull  → everything other devices changed since our cursor
 * Records are keyed `${collection}/${id}`. Device-only preferences (language, theme) are never synced.
 */
const LIST = ['items', 'events', 'wishes', 'bills', 'savings', 'goals'] as const;
type ListKey = (typeof LIST)[number];
const SETTING_KEYS = ['currency', 'calMode', 'showAlt', 'morning', 'evening'] as const;
type Rec = { collection: string; id: string; data: Record<string, unknown> };
type Remote = Rec & { deleted: boolean; updatedAt: string };

/** Stable stringify (sorted keys, undefined dropped): Postgres jsonb reorders keys, so plain JSON.stringify would see phantom changes. */
export function canon(v: unknown): string {
  if (v === undefined) return 'null';
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  const o = v as Record<string, unknown>;
  return '{' + Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + canon(o[k])).join(',') + '}';
}
export const keyOf = (collection: string, id: string) => `${collection}/${id}`;

export function toRecords(s: Pick<Collections, ListKey | 'activity'> & { settings: Settings }): Map<string, Rec> {
  const m = new Map<string, Rec>();
  for (const c of LIST) for (const x of s[c] as { id: string }[]) m.set(keyOf(c, x.id), { collection: c, id: x.id, data: x as unknown as Record<string, unknown> });
  for (const a of s.activity) m.set(keyOf('activity', String(a.day)), { collection: 'activity', id: String(a.day), data: a as unknown as Record<string, unknown> });
  const data: Record<string, unknown> = {}; for (const k of SETTING_KEYS) data[k] = s.settings[k];
  m.set(keyOf('settings', 'main'), { collection: 'settings', id: 'main', data });
  return m;
}

/** Write remote records into the local store (one atomic update). */
function applyRemote(upserts: Rec[], deletes: { collection: string; id: string }[]) {
  useData.setState((st) => {
    const next: Partial<Collections> & { settings?: Settings } = {};
    const lists = { ...Object.fromEntries(LIST.map((c) => [c, st[c]])), activity: st.activity } as Record<string, { id?: string; day?: number }[]>;
    const idOf = (c: string, x: { id?: string; day?: number }) => (c === 'activity' ? String(x.day) : x.id);
    for (const d of deletes) if (lists[d.collection]) lists[d.collection] = lists[d.collection]!.filter((x) => idOf(d.collection, x) !== d.id);
    let settings = st.settings;
    for (const r of upserts) {
      if (r.collection === 'settings') { const p: Partial<Settings> = {}; for (const k of SETTING_KEYS) if (k in r.data) (p as Record<string, unknown>)[k] = r.data[k]; settings = { ...settings, ...p }; continue; }
      const l = lists[r.collection]; if (!l) continue;
      const i = l.findIndex((x) => idOf(r.collection, x) === r.id); const item = r.data as { id?: string; day?: number };
      if (i >= 0) { const c = [...l]; c[i] = item; lists[r.collection] = c; } else lists[r.collection] = [...l, item];
    }
    for (const c of LIST) next[c] = lists[c] as never; next.activity = lists.activity as unknown as Activity[]; next.settings = settings;
    return next;
  });
}

export type SyncState = 'idle' | 'syncing' | 'offline' | 'error';
export const useSyncStatus = create<{ state: SyncState; lastAt: number | null }>(() => ({ state: 'idle', lastAt: null }));
const setStatus = (state: SyncState, ok = false) => useSyncStatus.setState((s) => ({ state, lastAt: ok ? Date.now() : s.lastAt }));

let running = false, again = false, onUnauthorized: (() => void) | null = null;

/** One sync round: push local changes, then pull remote ones. Safe to call any time; calls coalesce. */
export async function syncNow(): Promise<void> {
  if (running) { again = true; return; }
  const ns = currentNamespace(); if (!ns.startsWith('g:') || !useData.getState().hydrated) return;
  running = true; setStatus('syncing');
  try {
    do {
      again = false;
      const st0 = useData.getState(); const base = { ...st0.sync.base }; let cursor = st0.sync.cursor;
      const local = toRecords(st0);
      // ---- push
      const changes: object[] = []; const now = new Date().toISOString(); const pending = new Map<string, string | null>();
      for (const [k, r] of local) { const j = canon(r.data); if (base[k] !== j) { changes.push({ collection: r.collection, id: r.id, data: r.data, updatedAt: now }); pending.set(k, j); } }
      for (const k of Object.keys(base)) if (!local.has(k)) { const [collection, ...rest] = k.split('/'); changes.push({ collection, id: rest.join('/'), deleted: true, updatedAt: now }); pending.set(k, null); }
      const upserts: Rec[] = []; const deletes: { collection: string; id: string }[] = [];
      for (let i = 0; i < changes.length; i += 200) {
        const res = await api<{ applied: number; rejected: Remote[]; cursor: number }>('POST', '/v1/sync', { changes: changes.slice(i, i + 200) });
        for (const ch of changes.slice(i, i + 200) as { collection: string; id: string }[]) { const k = keyOf(ch.collection, ch.id), v = pending.get(k); if (v === null) delete base[k]; else if (v != null) base[k] = v; }
        for (const r of res.rejected) { const k = keyOf(r.collection, r.id); if (r.deleted) { deletes.push(r); delete base[k]; } else { upserts.push(r); base[k] = canon(r.data); } }
      }
      // ---- pull
      for (;;) {
        const page = await api<{ records: Remote[]; cursor: number; hasMore: boolean }>('GET', `/v1/sync?since=${cursor}&limit=500`);
        const cur = toRecords(useData.getState());
        for (const r of page.records) {
          const k = keyOf(r.collection, r.id);
          const dirty = r.deleted ? cur.has(k) && canon(cur.get(k)!.data) !== base[k] : cur.has(k) ? canon(cur.get(k)!.data) !== base[k] : base[k] !== undefined;   // unsynced local edit made while we were talking: keep it, it pushes next round
          if (dirty) continue;
          if (!r.deleted && cur.has(k) && canon(cur.get(k)!.data) === canon(r.data)) { base[k] = canon(r.data); continue; }   // our own echo: nothing to apply
          if (r.deleted) { deletes.push(r); delete base[k]; } else { upserts.push(r); base[k] = canon(r.data); }
        }
        cursor = page.cursor; if (!page.hasMore) break;
      }
      if (currentNamespace() !== ns) return;      // the user switched accounts mid-flight: drop this round
      if (upserts.length || deletes.length) applyRemote(upserts, deletes);
      useData.getState().setSync({ cursor, base });
      // local edits that happened during the round → go again
      const after = toRecords(useData.getState()); for (const [k, r] of after) if (base[k] !== canon(r.data)) { again = true; break; }
    } while (again);
    setStatus('idle', true);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) { setStatus('idle'); onUnauthorized?.(); }
    else setStatus(e instanceof ApiError && e.offline ? 'offline' : 'error');
  } finally { running = false; }
}

// ---------- scheduling ----------
let stopFns: (() => void)[] = [];
/** Begin syncing the current (Google) account: now, on every local change (debounced), on focus/online, and every minute. */
export function startSync(opts: { onUnauthorized: () => void }) {
  stopSync(); onUnauthorized = opts.onUnauthorized;
  let t: ReturnType<typeof setTimeout> | undefined;
  const schedule = (ms = 1500) => { clearTimeout(t); t = setTimeout(() => void syncNow(), ms); };
  const unsub = useData.subscribe((s, p) => { if (s.hydrated && (LIST.some((c) => s[c] !== p[c]) || s.activity !== p.activity || SETTING_KEYS.some((k) => s.settings[k] !== p.settings[k]))) schedule(); });
  const vis = () => { if (document.visibilityState === 'visible') void syncNow(); };
  const online = () => void syncNow();
  // minute poll, but only while the tab is visible: a forgotten background tab shouldn't keep the API and database busy
  const poll = setInterval(() => { if (document.visibilityState === 'visible') void syncNow(); }, 60_000);
  document.addEventListener('visibilitychange', vis); window.addEventListener('online', online);
  stopFns = [unsub, () => clearTimeout(t), () => clearInterval(poll), () => document.removeEventListener('visibilitychange', vis), () => window.removeEventListener('online', online)];
  void syncNow();
}
export function stopSync() { stopFns.forEach((f) => f()); stopFns = []; onUnauthorized = null; setStatus('idle'); }
