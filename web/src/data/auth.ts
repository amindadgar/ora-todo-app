import { create } from 'zustand';
import type { User } from '../lib/auth';
import { useData, clearState } from './store';
import { api, ApiError } from './api';
import { startSync, stopSync } from './sync';

export type AuthMode = 'guest' | 'google';
const KEY = 'ora-session';
/** What we remember on the device: who is signed in (the real session is an HttpOnly cookie held by the browser). */
interface Session { mode: AuthMode; user: User | null }

const read = (): Session | null => { try { const r = localStorage.getItem(KEY); return r ? (JSON.parse(r) as Session) : null; } catch { return null; } };
const write = (s: Session | null) => { try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch { /* private mode */ } };
const home = () => { try { location.hash = '/home'; } catch { /* ignore */ } };
/** storage namespace for an account: demo data keeps the original keys, each account gets its own */
export const nsFor = (s: Session | null) => (s?.mode === 'google' && s.user ? `g:${s.user.id}` : 'demo');

interface AuthState {
  mode: AuthMode | null; user: User | null;
  boot: () => Promise<void>;
  continueGuest: () => Promise<void>;
  /** Exchange a Google ID token for a server session. Throws ApiError (503 = server has no Google client ID configured). */
  signInWithCredential: (credential: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Permanently delete the account on the server and this device. */
  deleteAccount: () => Promise<void>;
}
export const useAuth = create<AuthState>((set, get) => {
  /** leave the account locally (data stays on the device for next time) */
  const leave = async () => {
    stopSync(); write(null); home(); set({ mode: null, user: null });
    await useData.getState().hydrate('demo');     // saves the account's data, then unloads it from memory
  };
  const begin = () => startSync({ onUnauthorized: () => { void get().signOut(); } });
  return {
    mode: null, user: null,
    async boot() {
      const s = read(); set({ mode: s?.mode ?? null, user: s?.user ?? null });
      await useData.getState().hydrate(nsFor(s), s?.mode === 'google');
      if (s?.mode === 'google' && s.user) {
        begin();
        // confirm the cookie session in the background; if it expired, sign out locally. Offline → stay signed in.
        api<{ user: User }>('GET', '/auth/me').then((r) => { write({ mode: 'google', user: r.user }); set({ user: r.user }); }).catch((e) => { if (e instanceof ApiError && e.status === 401) void leave(); });
      }
    },
    async continueGuest() { const s: Session = { mode: 'guest', user: null }; write(s); await useData.getState().hydrate('demo'); home(); set({ mode: 'guest', user: null }); },
    async signInWithCredential(credential) {
      const { user } = await api<{ user: User }>('POST', '/auth/google', { credential });
      const s: Session = { mode: 'google', user }; write(s);
      await useData.getState().hydrate(nsFor(s), true);   // a real account starts empty; sync then pulls whatever the server has
      home(); set({ mode: 'google', user }); begin();
    },
    async signOut() {
      (window as unknown as { google?: { accounts: { id: { disableAutoSelect: () => void } } } }).google?.accounts.id.disableAutoSelect();
      if (get().mode === 'google') { try { await api('POST', '/auth/logout'); } catch { /* offline: the cookie is cleared server-side when it expires */ } }
      await leave();
    },
    async deleteAccount() {
      const ns = nsFor({ mode: get().mode ?? 'guest', user: get().user });
      await api('DELETE', '/v1/account');
      await leave(); await clearState(ns);
    }
  };
});
