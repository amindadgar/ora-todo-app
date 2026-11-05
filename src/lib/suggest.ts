import type { Item } from '../data/types';
import type { Day } from './calendar';

const toMin = (t: string) => { const [h, m] = t.split(':'); return +h * 60 + +m; };
export const toHM = (m: number) => { const h = Math.floor(m / 60), mm = m % 60; return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm; };

/**
 * Next free slot today (≥60 min, at most 3 h), scanning from `fromMin` (default 17:00) to 22:00,
 * skipping timed, not-done, non-money items (each blocks its hour). Port of the prototype's algorithm.
 */
export function nextFreeSlot(items: Item[], today: Day, fromMin = 17 * 60, dayEnd = 22 * 60): [number, number] | null {
  const busy = items.filter((x) => x.day === today && x.time && !x.done && x.type !== 'expense' && x.type !== 'income').map((x) => toMin(x.time)).sort((a, b) => a - b);
  let slot: [number, number] | null = null, cursor = fromMin;
  for (const b of [...busy, dayEnd]) {
    if (slot) break;
    if (b + 60 <= cursor) continue;
    if (b - cursor >= 60) slot = [cursor, Math.min(b, cursor + 180)];
    else cursor = Math.max(cursor, b + 60);
  }
  return slot;
}
