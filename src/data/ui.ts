import { create } from 'zustand';
import type { Collections } from './types';
import { useData } from './store';
import type { EntryType } from '../lib/parser';
import type { Day } from '../lib/calendar';
import { motion } from '../tokens/tokens';

export type Screen = 'home' | 'calendar' | 'money' | 'key-dates' | 'wishlist' | 'goals' | 'settings';
export interface Toast { id: number; msg: string; undo?: (Collections & { fresh: boolean }) | null; view?: Screen | null }
export type EditKind = 'items' | 'events' | 'bills' | 'goals' | 'wishes' | 'savings';
export interface AddPreset { text?: string; type?: EntryType | null; day?: Day | null }

interface UIState {
  toast: Toast | null; seq: number;
  addOpen: AddPreset | null; edit: { kind: EditKind; id: string } | null;
  moreOpen: boolean; splash: boolean; celebrate: number | null; help: boolean;
  openAdd: (p?: AddPreset) => void; closeAdd: () => void;
  openEdit: (kind: EditKind, id: string) => void; closeEdit: () => void;
  setMore: (v: boolean) => void; setSplash: (v: boolean) => void; setHelp: (v: boolean) => void;
  /** Show a toast; pass a snapshot taken BEFORE the change to enable Undo. */
  notify: (msg: string, o?: { undo?: Toast['undo']; view?: Screen | null }) => void;
  dismissToast: () => void; doUndo: () => void; fireCelebrate: () => void;
}
let toastTimer: ReturnType<typeof setTimeout> | undefined;
export const useUI = create<UIState>((set, get) => ({
  toast: null, seq: 0, addOpen: null, edit: null, moreOpen: false, splash: true, celebrate: null, help: false,
  openAdd: (p) => set({ addOpen: p || {}, moreOpen: false }), closeAdd: () => set({ addOpen: null }),
  openEdit: (kind, id) => set({ edit: { kind, id } }), closeEdit: () => set({ edit: null }),
  setMore: (v) => set({ moreOpen: v }), setSplash: (v) => set({ splash: v }), setHelp: (v) => set({ help: v }),
  notify: (msg, o) => {
    const id = get().seq + 1; set({ seq: id, toast: { id, msg, undo: o?.undo ?? null, view: o?.view ?? null } });
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { if (get().toast?.id === id) set({ toast: null }); }, motion.toast);
  },
  dismissToast: () => set({ toast: null }),
  doUndo: () => { const t = get().toast; if (t?.undo) useData.getState().restore(t.undo); set({ toast: null }); },
  fireCelebrate: () => { const id = Date.now(); set({ celebrate: id }); setTimeout(() => { if (get().celebrate === id) set({ celebrate: null }); }, motion.confetti); }
}));
