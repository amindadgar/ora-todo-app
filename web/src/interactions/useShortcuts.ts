import { useEffect } from 'react';
import { useUI, type Screen } from '../data/ui';
import { useCal } from '../data/calState';

/**
 * Global keyboard shortcuts (desktop): N new entry · T today (opens Calendar) · ? help · Esc closes the top layer (handled by each layer).
 * Calendar-specific keys (arrows, PageUp/PageDown, Home/End) live on the calendar grid.
 */
export function useShortcuts(go: (s: Screen) => void) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable || el.closest('[role=dialog]') || el.closest('[role=menu]'))) return;
      const ui = useUI.getState(); if (ui.addOpen || ui.edit || ui.help || ui.splash) return;
      const k = e.key.toLowerCase();
      if (k === 'n') { e.preventDefault(); ui.openAdd(); }
      else if (k === 't') { e.preventDefault(); useCal.getState().set({ day: null, off: 0, dir: 0 }); go('calendar'); }
      else if (e.key === '?') { e.preventDefault(); ui.setHelp(true); }
    };
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on);
  }, [go]);
}
