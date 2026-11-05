import { IconButton } from './Buttons';
import { useData } from '../data/store';
import { useI18n } from '../i18n';
import { revealTheme } from '../interactions/themeReveal';

/** Theme + language quick toggles (Home header on phones; sidebar footer on desktop). */
export function HeaderActions({ className = '' }: { className?: string }) {
  const { t, lang } = useI18n(); const theme = useData((s) => s.settings.theme); const set = useData((s) => s.setSettings);
  const dark = theme === 'dark' || (theme === 'auto' && document.documentElement.dataset.theme === 'dark');
  return (
    <div className={className} style={{ display: 'flex', gap: 'var(--space-8)', flex: 'none' }}>
      <IconButton icon={dark ? 'sun' : 'moon'} label={dark ? t.light : t.dark} onClick={(e) => revealTheme(e.currentTarget, () => set({ theme: dark ? 'light' : 'dark' }))} />
      <button type="button" className="ibtn ibtn--outlined t-small" aria-label={t.langAria} lang={lang === 'fa' ? 'en' : 'fa'}
        style={{ width: 'auto', minWidth: 44, padding: '0 var(--space-12)', fontWeight: 600, fontFamily: lang === 'fa' ? 'var(--font-en)' : 'var(--font-fa)' }}
        onClick={() => set({ lang: lang === 'fa' ? 'en' : 'fa', calMode: null })}>{t.langBtn}</button>
    </div>
  );
}
