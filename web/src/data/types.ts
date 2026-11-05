import type { Day, CalMode } from '../lib/calendar';
import type { LText, Lang } from '../i18n/dict';
import type { EntryType } from '../lib/parser';

export type CatId = 'food' | 'transport' | 'fun' | 'bills' | 'home' | 'other';
export interface Item {
  id: string; type: Extract<EntryType, 'task' | 'event' | 'reminder' | 'expense' | 'income'>;
  title: LText; day: Day; time: string; urgent?: boolean; done?: boolean; doneAt?: Day; doneB?: number; amount?: number; cat?: CatId;
}
export interface KeyDate { id: string; title: LText; day: Day; yearly: boolean }
export interface Wish { id: string; title: LText; meta: LText }
export interface Bill { id: string; title: LText; day: Day; amount: number }
export interface Saving { id: string; title: LText; have: number; target: number }
export interface Goal { id: string; title: LText; have: number; target: number; unit: LText }
export type Theme = 'light' | 'dark' | 'auto';
export type Currency = 'toman' | 'rial';

export interface Settings {
  lang: Lang; theme: Theme; calMode: CalMode | null; currency: Currency; showAlt: boolean;
  morning: boolean; evening: boolean; fresh: boolean; tipSeen: boolean;
}
/** Tasks completed on a day, bucketed by time of day [morning, noon, evening, night]. Feeds the Goals charts. */
export interface Activity { day: Day; b: [number, number, number, number] }
export interface Collections { activity: Activity[]; items: Item[]; events: KeyDate[]; wishes: Wish[]; bills: Bill[]; savings: Saving[]; goals: Goal[] }
export type CollectionKey = keyof Collections;
/** Sync bookkeeping per account: server cursor + canonical JSON of every record as last synced. */
export interface SyncMeta { cursor: number; base: Record<string, string> }
export interface Persisted extends Collections { settings: Settings; version: 1; seededOn: Day; sync?: SyncMeta }
export const DEFAULT_SETTINGS: Settings = {
  lang: 'fa', theme: 'light', calMode: null, currency: 'toman', showAlt: true, morning: true, evening: true, fresh: false, tipSeen: false
};
