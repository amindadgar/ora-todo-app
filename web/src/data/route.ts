import { useEffect, useState } from 'react';
import type { Screen } from './ui';
const SCREENS: Screen[] = ['home', 'calendar', 'money', 'key-dates', 'wishlist', 'goals', 'insights', 'settings'];
const read = (): Screen => { const h = location.hash.replace(/^#\/?/, '') as Screen; return SCREENS.includes(h) ? h : 'home'; };
/** Hash router: back/forward buttons and deep links work on desktop; no server config needed. */
let navCount = 0;
export function useRoute(): [Screen, (s: Screen) => void, () => void] {
  const [s, setS] = useState<Screen>(read);
  useEffect(() => { const f = () => setS(read()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  return [s, (n) => { if (n !== read()) { navCount++; location.hash = '/' + n; } }, () => { if (navCount > 0) { navCount--; history.back(); } else location.hash = '/home'; }];
}
