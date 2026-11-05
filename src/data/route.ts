import { useEffect, useState } from 'react';
import type { Screen } from './ui';
const SCREENS: Screen[] = ['home', 'calendar', 'money', 'key-dates', 'wishlist', 'goals', 'settings'];
const read = (): Screen => { const h = location.hash.replace(/^#\/?/, '') as Screen; return SCREENS.includes(h) ? h : 'home'; };
/** Hash router: back/forward buttons and deep links work on desktop; no server config needed. */
export function useRoute(): [Screen, (s: Screen) => void] {
  const [s, setS] = useState<Screen>(read);
  useEffect(() => { const f = () => setS(read()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  return [s, (n) => { if (n !== read()) location.hash = '/' + n; }];
}
