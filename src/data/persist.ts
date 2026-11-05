import { openDB, type IDBPDatabase } from 'idb';
import type { Persisted } from './types';

const DB = 'ora', STORE = 'kv', KEY = 'state';
let dbp: Promise<IDBPDatabase> | null = null;
const db = () => (dbp ??= openDB(DB, 1, { upgrade(d) { d.createObjectStore(STORE); } }));

/** Local-first persistence: IndexedDB, falling back to localStorage when unavailable. */
export async function loadState(): Promise<Partial<Persisted> | null> {
  try { const v = await (await db()).get(STORE, KEY); if (v) return v as Partial<Persisted>; } catch { /* fall through */ }
  try { const raw = localStorage.getItem('ora-state-v1'); if (raw) return JSON.parse(raw); } catch { /* ignore */ }
  return null;
}
export async function saveState(s: Persisted): Promise<void> {
  try { await (await db()).put(STORE, JSON.parse(JSON.stringify(s)), KEY); return; } catch { /* fall back */ }
  try { localStorage.setItem('ora-state-v1', JSON.stringify(s)); } catch { /* quota/private mode */ }
}
export async function clearState(): Promise<void> {
  try { await (await db()).delete(STORE, KEY); } catch { /* ignore */ }
  try { localStorage.removeItem('ora-state-v1'); } catch { /* ignore */ }
}
