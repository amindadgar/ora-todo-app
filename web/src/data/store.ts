import { create } from 'zustand';
import { today } from '../lib/calendar';
import { makeSeed, emptyCollections } from './seed';
import { loadState, saveState, clearState } from './persist';
import { DEFAULT_SETTINGS, type Collections, type CollectionKey, type Persisted, type Settings, type SyncMeta } from './types';

const COLLECTION_KEYS: CollectionKey[] = ['activity', 'items', 'events', 'wishes', 'bills', 'savings', 'goals'];
const pickCollections = (s: Collections): Collections => ({ activity: s.activity, items: s.items, events: s.events, wishes: s.wishes, bills: s.bills, savings: s.savings, goals: s.goals });

interface DataState extends Collections {
  settings: Settings; hydrated: boolean; seededOn: number; sync: SyncMeta;
  setSync: (m: SyncMeta) => void;
  /** Load an account namespace. `emptyIfNew`: a brand-new real account starts empty instead of with demo samples. */
  hydrate: (ns?: string, emptyIfNew?: boolean) => Promise<void>;
  setSettings: (p: Partial<Settings>) => void;
  /** Replace collections (used by actions and by undo). */
  setCollections: (p: Partial<Collections>) => void;
  mutate: <K extends CollectionKey>(k: K, fn: (list: Collections[K]) => Collections[K]) => void;
  snapshot: () => Collections & { fresh: boolean };
  restore: (s: Collections & { fresh: boolean }) => void;
  resetToSamples: () => void;
  clearAll: () => void;
  setFresh: (fresh: boolean) => void;
}

export const useData = create<DataState>((set, get) => ({
  ...makeSeed(today()), settings: { ...DEFAULT_SETTINGS }, hydrated: false, seededOn: today(), sync: { cursor: 0, base: {} }, setSync: (m) => set({ sync: m }),
  async hydrate(name = 'demo', emptyIfNew = false) {
    // flush the account we are leaving, then switch namespace
    if (get().hydrated) { clearTimeout(timer); await saveState(ns, persisted(get())); }
    set({ hydrated: false }); ns = name;
    const saved = await loadState(name);
    if (saved && saved.version === 1) {
      const merged: Partial<DataState> = { settings: { ...DEFAULT_SETTINGS, ...(saved.settings || {}) } };
      for (const k of COLLECTION_KEYS) if (Array.isArray(saved[k])) (merged as Record<string, unknown>)[k] = saved[k];
      set({ ...merged, seededOn: saved.seededOn ?? today(), sync: saved.sync ?? { cursor: 0, base: {} }, hydrated: true });
    } else {
      // first run for this namespace. Carry over look-and-feel only (language, theme, currency).
      const { lang, theme, currency } = get().settings;
      const base = emptyIfNew ? emptyCollections() : makeSeed(today());
      set({ ...base, seededOn: today(), sync: { cursor: 0, base: {} }, settings: { ...DEFAULT_SETTINGS, lang, theme, currency }, hydrated: true });
    }
  },
  setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
  setCollections: (p) => set(p as Partial<DataState>),
  mutate: (k, fn) => set({ [k]: fn(get()[k]) } as Partial<DataState>),
  snapshot: () => ({ ...pickCollections(get()), fresh: get().settings.fresh }),
  restore: (s) => { const { fresh, ...c } = s; set({ ...c, settings: { ...get().settings, fresh } }); },
  clearAll: () => { set({ ...emptyCollections() }); },
  resetToSamples: () => { set({ ...makeSeed(today()), seededOn: today(), settings: { ...get().settings, fresh: false } }); },
  setFresh: (fresh) => set({ ...(fresh ? emptyCollections() : makeSeed(today())), settings: { ...get().settings, fresh } })
}));

let ns = 'demo';
export const currentNamespace = () => ns;
let timer: ReturnType<typeof setTimeout> | undefined;
const persisted = (s: DataState): Persisted => ({ version: 1, seededOn: s.seededOn, settings: s.settings, sync: s.sync, ...pickCollections(s) });
// debounce-persist after hydration
useData.subscribe((s) => {
  if (!s.hydrated) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    void saveState(ns, persisted(s));
  }, 250);
});
export { clearState };

/** Export / import (JSON backup). */
export const exportJson = () => { const s = useData.getState(); return JSON.stringify({ version: 1, seededOn: s.seededOn, settings: s.settings, ...pickCollections(s) }, null, 2); };
export function importJson(text: string): boolean {
  try {
    const p = JSON.parse(text) as Partial<Persisted>; if (p.version !== 1) return false;
    const patch: Partial<Collections> = {}; for (const k of COLLECTION_KEYS) if (Array.isArray(p[k])) (patch as Record<string, unknown>)[k] = p[k];
    useData.setState({ ...patch, settings: { ...DEFAULT_SETTINGS, ...(p.settings || {}) } }); return true;
  } catch { return false; }
}
