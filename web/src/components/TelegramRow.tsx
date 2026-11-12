import { useCallback, useEffect, useState } from 'react';
import { api } from '../data/api';
import { Button } from './Buttons';
import type { Dict, Lang } from '../i18n/dict';

interface Status { enabled: boolean; linked: boolean }
/** Settings row: link the Telegram bot to this account (hidden when the server has no bot configured). */
export function TelegramRow({ t, lang, onStatus }: { t: Dict; lang: Lang; onStatus?: (s: Status) => void }) {
  const [st, setSt] = useState<Status | null>(null); const [url, setUrl] = useState<string | null>(null); const [err, setErr] = useState(false); const [busy, setBusy] = useState(false);
  const load = useCallback(() => api<Status>('GET', '/v1/telegram').then(setSt).catch(() => setSt({ enabled: false, linked: false })), []);
  useEffect(() => { void load(); }, [load]);
  // after the link is created, poll until the user has pressed Start in Telegram (code lives 10 minutes)
  useEffect(() => {
    if (!url || st?.linked) return; const stop = Date.now() + 10 * 60_000;
    const i = setInterval(() => { if (Date.now() > stop) { clearInterval(i); setUrl(null); } else void load(); }, 3000); return () => clearInterval(i);
  }, [url, st?.linked, load]);
  useEffect(() => { if (st?.linked) setUrl(null); }, [st?.linked]);
  useEffect(() => { if (st) onStatus?.({ enabled: st.enabled, linked: st.linked }); }, [st, onStatus]);   // only once the server has answered
  const connect = async () => {
    setBusy(true); setErr(false);
    try { const r = await api<{ url: string }>('POST', '/v1/telegram/link-code', { lang, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }); setUrl(r.url); window.open(r.url, '_blank', 'noopener'); }
    catch { setErr(true); } finally { setBusy(false); }
  };
  const disconnect = async () => { await api('DELETE', '/v1/telegram').catch(() => {}); setUrl(null); await load(); };
  return (
    <div className="row" style={{ padding: 'var(--space-12) 0', alignItems: 'flex-start' }} data-testid="telegram-row">
      <div className="row__body" style={{ minWidth: 0, gap: 'var(--space-2)' }}>
        <span className="t-label" style={{ fontWeight: 600 }}>{t.telegram}</span>
        <span className="t-caption muted">{t.telegramDesc}</span>
        {st && !st.enabled && <span className="t-caption muted" role="status">{t.telegramOff}</span>}
        {st?.linked && <span className="t-caption success" role="status" data-testid="telegram-status">{t.telegramConnected}</span>}
        {!st?.linked && url && <><a className="t-caption brand" href={url} target="_blank" rel="noopener">{t.openTelegram}</a><span className="t-caption muted" role="status">{t.waitingTelegram}</span></>}
        {err && <span className="t-caption danger" role="alert">{t.telegramFailed}</span>}
      </div>
      {st?.linked ? <Button variant="secondary" size="sm" onClick={() => void disconnect()}>{t.disconnect}</Button>
        : <Button variant="secondary" size="sm" disabled={busy || !st?.enabled} onClick={() => void connect()}>{t.connectTelegram}</Button>}
    </div>
  );
}
