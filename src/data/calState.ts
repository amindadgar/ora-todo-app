import { create } from 'zustand';
import { today, type Day } from '../lib/calendar';
/** Shared calendar view state: selected day and month offset (relative to today's month). */
export const useCal = create<{ day: Day | null; off: number; dir: number; set: (p: Partial<{ day: Day | null; off: number; dir: number }>) => void }>((set) => ({
  day: null, off: 0, dir: 0, set: (p) => set(p)
}));
export const selectedDay = (d: Day | null) => d ?? today();
