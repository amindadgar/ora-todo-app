import { useData } from './store';
import { useUI } from './ui';
import { dicts } from '../i18n/dict';
import { makeFormat } from '../i18n/format';
import type { Collections, Item } from './types';
import { today, type Day } from '../lib/calendar';
import { toHM } from '../lib/suggest';

const lang = () => useData.getState().settings.lang;
const T = () => dicts[lang()];
const fmt = () => makeFormat(lang(), useData.getState().settings.currency);
const snap = () => useData.getState().snapshot();

/** time-of-day bucket: 0 morning (<12), 1 noon (12–16), 2 evening (16–20), 3 night */
export const bucketOf = (min: number) => (min < 12 * 60 ? 0 : min < 16 * 60 ? 1 : min < 20 * 60 ? 2 : 3);
function bumpActivity(day: Day, bucket: number, delta: 1 | -1) {
  useData.getState().mutate('activity', (l) => {
    const i = l.findIndex((a) => a.day === day); const next = [...l];
    if (i < 0) { if (delta > 0) { const b: [number, number, number, number] = [0, 0, 0, 0]; b[bucket] = 1; next.push({ day, b }); } return next; }
    const b = [...next[i].b] as [number, number, number, number]; b[bucket] = Math.max(0, b[bucket] + delta); next[i] = { day, b }; return next;
  });
}
export function setDone(id: string, done: boolean, openCount?: number) {
  const cur = useData.getState().items.find((x) => x.id === id); if (!cur) return;
  const now = new Date(); const t0 = today();
  if (done && !cur.done) { const b = bucketOf(now.getHours() * 60 + now.getMinutes()); bumpActivity(t0, b, 1); useData.getState().mutate('items', (l) => l.map((x) => (x.id === id ? { ...x, done, doneAt: t0, doneB: b } : x))); }
  else if (!done && cur.done) { if (cur.doneAt != null && cur.doneB != null) bumpActivity(cur.doneAt, cur.doneB, -1); useData.getState().mutate('items', (l) => l.map((x) => (x.id === id ? { ...x, done, doneAt: undefined, doneB: undefined } : x))); }
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
