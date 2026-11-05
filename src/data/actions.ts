import { useData } from './store';
import { useUI } from './ui';
import { dicts } from '../i18n/dict';
import { makeFormat } from '../i18n/format';
import type { Collections, Item } from './types';
import type { Day } from '../lib/calendar';
import { toHM } from '../lib/suggest';

const lang = () => useData.getState().settings.lang;
const T = () => dicts[lang()];
const fmt = () => makeFormat(lang(), useData.getState().settings.currency);
const snap = () => useData.getState().snapshot();

export function setDone(id: string, done: boolean, openCount?: number) {
  useData.getState().mutate('items', (l) => l.map((x) => (x.id === id ? { ...x, done } : x)));
  if (done && openCount === 1) setTimeout(() => useUI.getState().fireCelebrate(), 120);
}
export function removeFrom<K extends 'items' | 'events' | 'bills' | 'goals' | 'wishes' | 'savings'>(kind: K, id: string) {
  const s = snap();
  useData.getState().mutate(kind, ((l: { id: string }[]) => l.filter((x) => x.id !== id)) as never);
  useUI.getState().notify(T().deleted, { undo: s });
}
export function updateIn(kind: 'items' | 'events' | 'bills' | 'goals' | 'wishes' | 'savings', id: string, patch: Record<string, unknown>) {
  useData.getState().mutate(kind, ((l: { id: string }[]) => l.map((x) => (x.id === id ? { ...x, ...patch } : x))) as never);
}
export function shiftOneDay(kind: 'items' | 'events' | 'bills', id: string) {
  const s = snap();
  const col = useData.getState()[kind] as { id: string; day: Day }[];
  const cur = col.find((x) => x.id === id); if (!cur) return;
  updateIn(kind, id, kind === 'items' ? { day: cur.day + 1, done: false } : { day: cur.day + 1 });
  useUI.getState().notify(T().movedLater, { undo: s });
}
export function addSuggestion(title: string, startMin: number, today: Day) {
  const s = snap();
  const it: Item = { id: 'u' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), type: 'task', title, day: today, time: toHM(startMin) };
  useData.getState().mutate('items', (l) => [...l, it]);
  useUI.getState().notify(T().addedToday, { undo: s });
}
export type { Collections };
export { fmt };
