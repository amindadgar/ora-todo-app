import { create } from 'zustand';
import type { User } from '../lib/auth';
import { useData } from './store';

export type AuthMode = 'guest' | 'google';
const KEY = 'ora-session';
interface Session { mode: AuthMode; user: User | null }

const read = (): Session | null => { try { const r = localStorage.getItem(KEY); return r ? (JSON.parse(r) as Session) : null; } catch { return null; } };
const write = (s: Session | null) => { try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch { /* private mode */ } };
/** storage namespace for an account: demo data keeps the original keys, each Google account gets its own */
const home = () => { try { location.hash = '/home'; } catch { /* ignore */ } };
export const nsFor = (s: Session | null) => (s?.mode === 'google' && s.user ? `g:${s.user.id}` : 'demo');

interface AuthState {
  mode: AuthMode | null; user: User | null;
  /** Load the saved session and its data (call once at start-up). */
  boot: () => Promise<void>;
  continueGuest: () => Promise<void>;
  /** A real account starts with an empty app (no demo data). */
  signInGoogle: (u: User) => Promise<void>;
  signOut: () => Promise<void>;
}
export const useAuth = create<AuthState>((set) => ({
  mode: null, user: null,
  async boot() { const s = read(); set({ mode: s?.mode ?? null, user: s?.user ?? null }); await useData.getState().hydrate(nsFor(s), s?.mode === 'google'); },
  async continueGuest() { const s: Session = { mode: 'guest', user: null }; write(s); await useData.getState().hydrate('demo'); home(); set({ mode: 'guest', user: null }); },
  async signInGoogle(user) { const s: Session = { mode: 'google', user }; write(s); await useData.getState().hydrate(nsFor(s), true); home(); set({ mode: 'google', user }); },
  async signOut() {
    (window as unknown as { google?: { accounts: { id: { disableAutoSelect: () => void } } } }).google?.accounts.id.disableAutoSelect();
    write(null); home(); set({ mode: null, user: null });
    await useData.getState().hydrate('demo');     // saves the account's data, then unloads it from memory
  }
}));
