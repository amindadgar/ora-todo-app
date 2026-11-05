import { create } from 'zustand';
import { today } from '../lib/calendar';
import { makeSeed, emptyCollections } from './seed';
import { loadState, saveState, clearState } from './persist';
import { DEFAULT_SETTINGS, type Collections, type CollectionKey, type Persisted, type Settings } from './types';

const COLLECTION_KEYS: CollectionKey[] = ['activity', 'items', 'events', 'wishes', 'bills', 'savings', 'goals'];
const pickCollections = (s: Collections): Collections => ({ activity: s.activity, items: s.items, events: s.events, wishes: s.wishes, bills: s.bills, savings: s.savings, goals: s.goals });

interface DataState extends Collections {
  settings: Settings; hydrated: boolean; seededOn: number;
  hydrate: () => Promise<void>;
  setSettings: (p: Partial<Settings>) => void;
  /** Replace collections (used by actions and by undo). */
  setCollections: (p: Partial<Collections>) => void;
  mutate: <K extends CollectionKey>(k: K, fn: (list: Collections[K]) => Collections[K]) => void;
  snapshot: () => Collections & { fresh: boolean };
  restore: (s: Collections & { fresh: boolean }) => void;
  resetToSamples: () => void;
  setFresh: (fresh: boolean) => void;
}

export const useData = create<DataState>((set, get) => ({
  ...makeSeed(today()), settings: { ...DEFAULT_SETTINGS }, hydrated: false, seededOn: today(),
  async hydrate() {
    const saved = await loadState();
    if (saved && saved.version === 1) {
      const merged: Partial<DataState> = { settings: { ...DEFAULT_SETTINGS, ...(saved.settings || {}) } };
      for (const k of COLLECTION_KEYS) if (Array.isArray(saved[k])) (merged as Record<string, unknown>)[k] = saved[k];
      set({ ...merged, seededOn: saved.seededOn ?? today(), hydrated: true });
    } else {
      // first run: samples relative to the real current day
      set({ ...makeSeed(today()), seededOn: today(), hydrated: true });
    }
  },
  setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
  setCollections: (p) => set(p as Partial<DataState>),
  mutate: (k, fn) => set({ [k]: fn(get()[k]) } as Partial<DataState>),
  snapshot: () => ({ ...pickCollections(get()), fresh: get().settings.fresh }),
  restore: (s) => { const { fresh, ...c } = s; set({ ...c, settings: { ...get().settings, fresh } }); },
  resetToSamples: () => { set({ ...makeSeed(today()), seededOn: today(), settings: { ...get().settings, fresh: false } }); },
  setFresh: (fresh) => set({ ...(fresh ? emptyCollections() : makeSeed(today())), settings: { ...get().settings, fresh } })
}));

// debounce-persist after hydration
let timer: ReturnType<typeof setTimeout> | undefined;
useData.subscribe((s) => {
  if (!s.hydrated) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    const p: Persisted = { version: 1, seededOn: s.seededOn, settings: s.settings, ...pickCollections(s) };
    void saveState(p);
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
