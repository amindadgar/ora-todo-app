import { useEffect, useMemo } from 'react';
import { useData } from '../data/store';
import { makeFormat, type Fmt } from './format';
import { primitives } from '../tokens/tokens';

/** Language + direction + formatters, derived from settings. */
export function useI18n(): Fmt & { dir: 'rtl' | 'ltr' } {
  const lang = useData((s) => s.settings.lang), currency = useData((s) => s.settings.currency);
  return useMemo(() => ({ ...makeFormat(lang, currency), dir: lang === 'fa' ? 'rtl' : 'ltr' as 'rtl' | 'ltr' }), [lang, currency]);
}

/** Applies lang/dir/theme to <html> so tokens, fonts and logical CSS react. */
export function useDocumentSettings() {
  const lang = useData((s) => s.settings.lang), theme = useData((s) => s.settings.theme);
  useEffect(() => { const r = document.documentElement; r.lang = lang; r.dir = lang === 'fa' ? 'rtl' : 'ltr'; }, [lang]);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'auto' && !!mq?.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? primitives['neutral-950'] : primitives['blue-500']);
    };
    apply(); mq?.addEventListener?.('change', apply); return () => mq?.removeEventListener?.('change', apply);
  }, [theme]);
}
export function useIsDark() { return useData((s) => s.settings.theme) === 'dark'; }
