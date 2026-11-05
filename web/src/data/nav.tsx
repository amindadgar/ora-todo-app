import { createContext, useContext } from 'react';
import type { Screen } from './ui';
export const NavCtx = createContext<{ screen: Screen; go: (s: Screen) => void; back: () => void }>({ screen: 'home', go: () => {}, back: () => {} });
export const useNav = () => useContext(NavCtx);
