import { useCallback, useEffect, useState } from 'react';
import { api } from '../data/api';
import { useMeetings } from '../data/meetings';
import { Button } from './Buttons';
import { Segment } from './Selection';
import type { Dict, Lang } from '../i18n/dict';

const REMIND = [0, 5, 10, 15, 30];
export const remindOptions = (t: Dict, N: (n: number) => string): [string, string][] => REMIND.map((m) => [String(m), m === 0 ? t.remindOff : t.remindMin(N(m))] as [string, string]);

const supported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const b64 = (s: string) => { const p = '='.repeat((4 - (s.length % 4)) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, (c) => c.charCodeAt(0)); };

/** Settings row: Web Push on this device (hidden unless the server has VAPID keys). */
export function PushRow({ t, lang }: { t: Dict; lang: Lang }) {
  const [enabled, setEnabled] = useState(false); const [on, setOn] = useState(false); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try { const r = await api<{ enabled: boolean }>('GET', '/v1/push'); setEnabled(r.enabled); } catch { setEnabled(false); }
    if (supported()) { const reg = await navigator.serviceWorker.getRegistration(); const sub = await reg?.pushManager.getSubscription(); setOn(!!sub && Notification.permission === 'granted'); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  if (!enabled) return null;
  const turnOn = async () => {
    setBusy(true); setMsg('');
    try {
      if (!supported()) { setMsg(/iPhone|iPad/.test(navigator.userAgent) ? t.pushIos : t.pushUnsupported); return; }
      if ((await Notification.requestPermission()) !== 'granted') { setMsg(t.pushDenied); return; }
      const { key } = await api<{ key: string }>('GET', '/v1/push'); const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) }));
      const j = sub.toJSON(); await api('POST', '/v1/push/subscribe', { endpoint: j.endpoint, keys: j.keys, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, lang });
      setOn(true);
    } catch { setMsg(t.pushFailed); } finally { setBusy(false); }
  };
  const turnOff = async () => {
    setBusy(true);
    try { const reg = await navigator.serviceWorker.getRegistration(); const sub = await reg?.pushManager.getSubscription(); if (sub) { await api('POST', '/v1/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); } setOn(false); } finally { setBusy(false); }
  };
  return (
    <div className="row" style={{ padding: 'var(--space-12) 0', alignItems: 'flex-start' }} data-testid="push-row">
      <div className="row__body" style={{ minWidth: 0, gap: 'var(--space-2)' }}>
        <span className="t-label" style={{ fontWeight: 600 }}>{t.pushTitle}</span><span className="t-caption muted">{t.pushDesc}</span>
        {on && <span className="t-caption success" role="status">{t.gcalConnected}</span>}
        {msg && <span className="t-caption danger" role="alert">{msg}</span>}
      </div>
      <Button variant="secondary" size="sm" disabled={busy} onClick={() => void (on ? turnOff() : turnOn())}>{on ? t.pushOffBtn : t.pushOn}</Button>
    </div>
  );
}

/** Settings row: connect Google Calendar (read-only). Hidden unless the server has the OAuth secret + key. */
export function GcalRow({ t, onResult }: { t: Dict; onResult?: (r: string | null) => void }) {
  const [st, setSt] = useState<{ enabled: boolean; linked: boolean } | null>(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const load = useCallback(() => api<{ enabled: boolean; linked: boolean }>('GET', '/v1/gcal').then(setSt).catch(() => setSt({ enabled: false, linked: false })), []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {   // back from Google: #/settings?gcal=ok|denied|failed
    const m = location.hash.match(/gcal=(\w+)/); if (!m) return;
    setErr(m[1] === 'denied' ? t.gcalDenied : m[1] === 'failed' ? t.gcalFailed : ''); onResult?.(m[1]!); if (m[1] === 'ok') void useMeetings.getState().load();
    history.replaceState(null, '', '#/settings');
  }, [t, onResult]);
  if (!st?.enabled) return null;
  const connect = async () => { setBusy(true); setErr(''); try { const r = await api<{ url: string }>('POST', '/v1/gcal/connect', {}); location.href = r.url; } catch { setErr(t.gcalFailed); setBusy(false); } };
  const disconnect = async () => { await api('DELETE', '/v1/gcal').catch(() => {}); useMeetings.getState().clear(); await load(); };
  return (
    <div className="row" style={{ padding: 'var(--space-12) 0', alignItems: 'flex-start' }} data-testid="gcal-row">
      <div className="row__body" style={{ minWidth: 0, gap: 'var(--space-2)' }}>
        <span className="t-label" style={{ fontWeight: 600 }}>{t.gcalTitle}</span><span className="t-caption muted">{t.gcalDesc}</span>
        {st.linked && <span className="t-caption success" role="status">{t.gcalConnected}</span>}
        {err && <span className="t-caption danger" role="alert">{err}</span>}
      </div>
      {st.linked ? <Button variant="secondary" size="sm" onClick={() => void disconnect()}>{t.gcalDisconnect}</Button> : <Button variant="secondary" size="sm" disabled={busy} onClick={() => void connect()}>{t.gcalConnect}</Button>}
    </div>
  );
}

export { Segment };
