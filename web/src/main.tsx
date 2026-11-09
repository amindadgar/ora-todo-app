import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/figtree/400.css'; import '@fontsource/figtree/500.css'; import '@fontsource/figtree/600.css'; import '@fontsource/figtree/700.css';
import '@fontsource/vazirmatn/400.css'; import '@fontsource/vazirmatn/500.css'; import '@fontsource/vazirmatn/600.css'; import '@fontsource/vazirmatn/700.css'; import '@fontsource/vazirmatn/800.css';
import { buildTokenCss, buildTypeClasses } from './tokens/css';
import './styles/global.css';
import './styles/screens.css';
import { App } from './App';
import { useData } from './data/store';
import { useAuth } from './data/auth';
import { initInstall } from './data/install';
import { setToday, dayFromG } from './lib/calendar';

// tokens → CSS custom properties (single source: tokens.ts)
const style = document.createElement('style'); style.id = 'ora-tokens'; style.textContent = buildTokenCss() + buildTypeClasses(); document.head.prepend(style);

// test/screenshot hook: ?today=2026-10-06&lang=fa&theme=dark&splash=0
initInstall();                      // listen for the browser's install prompt before React mounts
const q = new URLSearchParams(location.search);
const td = q.get('today'); if (td) { const [y, m, d] = td.split('-').map(Number); setToday(dayFromG(y, m, d)); }
void useAuth.getState().boot().then(async () => {
  if (q.has('guest') && !useAuth.getState().mode) await useAuth.getState().continueGuest();   // test hook
  const s = useData.getState();
  const patch: Record<string, unknown> = {}; if (q.get('lang')) patch.lang = q.get('lang'); if (q.get('theme')) patch.theme = q.get('theme');
  if (Object.keys(patch).length) s.setSettings(patch);
  createRoot(document.getElementById('root')!).render(<StrictMode><App skipSplash={q.get('splash') === '0'} /></StrictMode>);
});
