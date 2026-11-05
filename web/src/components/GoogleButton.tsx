import { useEffect, useRef, useState } from 'react';
import { Button } from './Buttons';
import { ApiError } from '../data/api';

/** Google OAuth client ID (Google Cloud Console → Credentials → OAuth client → Web). Set VITE_GOOGLE_CLIENT_ID in .env.local. */
export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || '';
/** Dev-only test hook: `npm run dev` + `?mockGoogle=<id>` signs in as a fake account (the API must run with AUTH_MOCK=true). Stripped from production builds. */
const MOCK = import.meta.env.DEV ? new URLSearchParams(location.search).get('mockGoogle') : null;

interface GIS { accounts: { id: { initialize: (c: { client_id: string; callback: (r: { credential: string }) => void; auto_select?: boolean }) => void; renderButton: (el: HTMLElement, o: Record<string, unknown>) => void } } }
let loading: Promise<void> | null = null;
const loadGis = () => (loading ??= new Promise<void>((res, rej) => {
  if ((window as unknown as { google?: GIS }).google) { res(); return; }
  const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true;
  s.onload = () => res(); s.onerror = () => { loading = null; rej(new Error('gis')); }; document.head.appendChild(s);
}));

const GMark = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
    <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3.1-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);

/** "Continue with Google". Uses Google's own rendered button when a client ID is configured. */
export function GoogleButton({ label, setupHint, failedLabel, lang, onCredential }: { label: string; setupHint: string; failedLabel: string; lang: string; onCredential: (credential: string) => Promise<void> }) {
  const host = useRef<HTMLDivElement>(null); const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || MOCK) return; let dead = false;
    loadGis().then(() => {
      if (dead || !host.current) return; const g = (window as unknown as { google: GIS }).google;
      g.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: (r) => { setErr(null); onCredential(r.credential).catch((e) => setErr(e instanceof ApiError && e.status === 503 ? setupHint : failedLabel)); } });
      host.current.innerHTML = ''; g.accounts.id.renderButton(host.current, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', width: Math.min(400, Math.round(host.current.clientWidth) || 320), locale: lang });
    }).catch(() => setErr(failedLabel));
    return () => { dead = true; };
  }, [lang, onCredential, failedLabel, setupHint]);

  if (MOCK !== null) {
    const id = MOCK || 'mock-1';
    return (<div className="stack" style={{ alignItems: 'stretch' }}><Button variant="secondary" size="lg" block data-testid="google-mock" onClick={() => { setErr(null); onCredential(`mock:${id}:Sara Test`).catch(() => setErr(failedLabel)); }}><GMark />{label}</Button>{err && <span className="t-caption danger" role="alert">{err}</span>}</div>);
  }
  if (!GOOGLE_CLIENT_ID) {
    return (<div className="stack" style={{ alignItems: 'stretch' }}><Button variant="secondary" size="lg" block disabled><GMark />{label}</Button><span className="t-caption muted" role="note">{setupHint}</span></div>);
  }
  // Google renders its button in a cross-origin iframe, so we can't style its text/font. Show our own button (app font, translated label)
  // and put Google's real button on top, invisible: clicks still reach Google, so the sign-in flow is unchanged.
  return (
    <div className="stack" style={{ alignItems: 'stretch' }}>
      <div className="gbtn-wrap">
        <Button variant="secondary" size="lg" block tabIndex={-1} aria-hidden="true" style={{ pointerEvents: 'none' }}><GMark />{label}</Button>
        <div ref={host} className="gbtn-overlay" />
      </div>
      {err && <span className="t-caption danger" role="alert">{err}</span>}
    </div>
  );
}
