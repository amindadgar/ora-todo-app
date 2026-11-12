import { useEffect } from 'react';
import { create } from 'zustand';
import { api } from './api';
import { useAuth } from './auth';
import { dayFromG } from '../lib/calendar';
import type { Item } from './types';

/** Read-only meetings from the user's Google Calendar (fetched through the API; never synced or persisted). */
export interface Meeting { id: string; title: string; day: number; start: string; end: string }
const hm = (d: Date) => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
export const useMeetings = create<{ linked: boolean; list: Meeting[]; load: () => Promise<void>; clear: () => void }>((set) => ({
  linked: false, list: [],
  async load() {
    try {
      const r = await api<{ linked: boolean; events: { id: string; title: string; start: string; end: string }[] }>('GET', '/v1/gcal/events');
      set({ linked: r.linked, list: r.events.map((e) => { const s = new Date(e.start), en = new Date(e.end); return { id: e.id, title: e.title, day: dayFromG(s.getFullYear(), s.getMonth() + 1, s.getDate()), start: hm(s), end: hm(en) }; }) });
    } catch { /* offline or not configured: keep what we have */ }
  },
  clear: () => set({ linked: false, list: [] })
}));
/** Meetings as busy "items" so the free-time suggestion steers around them. */
export const meetingsAsItems = (l: Meeting[]): Item[] => l.map((m) => ({ id: 'g:' + m.id, type: 'event' as const, title: m.title, day: m.day, time: m.start }));

/** Keep the meetings fresh while the app is open: on sign-in, every 5 minutes, and when the tab regains focus. */
export function useMeetingsSync() {
  const real = useAuth((a) => a.mode) === 'google';
  useEffect(() => {
    const { load, clear } = useMeetings.getState();
    if (!real) { clear(); return; }
    void load(); const i = setInterval(() => void load(), 5 * 60_000); const v = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', v); return () => { clearInterval(i); document.removeEventListener('visibilitychange', v); };
  }, [real]);
}
