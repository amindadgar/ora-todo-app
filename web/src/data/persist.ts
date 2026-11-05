import { openDB, type IDBPDatabase } from 'idb';
import type { Persisted } from './types';

const DB = 'ora', STORE = 'kv';
/** Each account has its own namespace. 'demo' keeps the original keys so existing data is untouched. */
const keyOf = (ns: string) => (ns === 'demo' ? 'state' : `state:${ns}`);
const lsKeyOf = (ns: string) => (ns === 'demo' ? 'ora-state-v1' : `ora-state-v1:${ns}`);
let dbp: Promise<IDBPDatabase> | null = null;
const db = () => (dbp ??= openDB(DB, 1, { upgrade(d) { d.createObjectStore(STORE); } }));

/** Local-first persistence: IndexedDB, falling back to localStorage when unavailable. */
export async function loadState(ns = 'demo'): Promise<Partial<Persisted> | null> {
  try { const v = await (await db()).get(STORE, keyOf(ns)); if (v) return v as Partial<Persisted>; } catch { /* fall through */ }
  try { const raw = localStorage.getItem(lsKeyOf(ns)); if (raw) return JSON.parse(raw); } catch { /* ignore */ }
  return null;
}
export async function saveState(ns: string, s: Persisted): Promise<void> {
  try { await (await db()).put(STORE, JSON.parse(JSON.stringify(s)), keyOf(ns)); return; } catch { /* fall back */ }
  try { localStorage.setItem(lsKeyOf(ns), JSON.stringify(s)); } catch { /* quota/private mode */ }
}
export async function clearState(ns = 'demo'): Promise<void> {
  try { await (await db()).delete(STORE, keyOf(ns)); } catch { /* ignore */ }
  try { localStorage.removeItem(lsKeyOf(ns)); } catch { /* ignore */ }
}
