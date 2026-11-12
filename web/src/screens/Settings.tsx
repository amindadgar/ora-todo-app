import { useState } from 'react';
import { useData, clearState } from '../data/store';
import { useUI } from '../data/ui';
import { useNav } from '../data/nav';
import { useAuth } from '../data/auth';
import { initials } from '../lib/auth';
import { useSyncStatus } from '../data/sync';
import { TelegramRow } from '../components/TelegramRow';
import { InstallRow } from '../components/InstallUI';
import { useI18n } from '../i18n';
import { PageHeader } from '../components/Navigation';
import { Segment, Toggle } from '../components/Selection';
import { TextButton, Button } from '../components/Buttons';
import { Card } from '../components/Cards';
import { revealTheme } from '../interactions/themeReveal';

export function SettingsScreen() {
  const f = useI18n(); const { t } = f; const ui = useUI(); const nav = useNav();
  const { mode: authMode, user } = useAuth(); const real = authMode === 'google'; const sync = useSyncStatus();
  const [tg, setTg] = useState(false);
  const { settings: s, setSettings: set } = useData();  const row = (label: string, ctl: React.ReactNode, key: string) => <div key={key} className="row" style={{ justifyContent: 'space-between', padding: 'var(--space-10) 0' }}><span className="t-label" style={{ fontWeight: 400 }}>{label}</span>{ctl}</div>;
  const sw = (id: string, label: string, sub: string, on: boolean, flip: () => void) => (
    <div key={id} className="row" style={{ padding: 'var(--space-10) 0' }}>
      <div className="row__body"><span id={'sw-' + id} className="t-label" style={{ fontWeight: 400 }}>{label}</span><span className="t-caption muted">{sub}</span></div>
      <Toggle checked={on} onChange={flip} labelledBy={'sw-' + id} />
    </div>
  );
  const reset = () => {
    const snap = useData.getState().snapshot();
    void clearState(); useData.getState().resetToSamples(); ui.notify(t.sampleRestored, { undo: snap });
  };
  return (
    <main aria-label={t.settings} className="narrow">
      <PageHeader title={t.settings} onBack={nav.back} backLabel={t.back} />
      <div className="screen screen--flush">
        <Card as="div" className="list" aria-label={t.account}>
          <div className="row" style={{ padding: 'var(--space-12) 0' }}>
            <span className="avatar" aria-hidden={!user?.picture}>{user?.picture ? <img src={user.picture} alt={t.avatarOf(user.name)} referrerPolicy="no-referrer" /> : real && user ? initials(user.name) : 'D'}</span>
            <div className="row__body" style={{ minWidth: 0 }}>
              <span className="t-label" style={{ fontWeight: 600 }}>{real && user ? user.name : t.demoAccount}</span>
              <span className="t-caption muted" style={{ overflowWrap: 'anywhere' }}>{real && user ? user.email : t.demoAccountDesc}</span>
              {real && <span className="t-caption" role="status" data-testid="sync-status" style={{ color: sync.state === 'error' ? 'var(--c-status-danger)' : 'var(--c-text-secondary)' }}>{{ idle: t.syncIdle, syncing: t.syncing, offline: t.syncOffline, error: t.syncError }[sync.state]}</span>}
            </div>
            <Button variant="secondary" size="sm" onClick={() => void useAuth.getState().signOut()}>{real ? t.signOut : t.signInGoogle}</Button>
          </div>
          <InstallRow t={t} />
          {real && <TelegramRow t={t} lang={s.lang} onLinked={setTg} />}
          {row(t.language, <Segment label={t.language} value={s.lang} options={[['fa', t.persian], ['en', t.english]]} onChange={(v) => set({ lang: v, calMode: null })} />, 'lang')}
          {row(t.theme, <Segment label={t.theme} value={s.theme} options={[['light', t.light], ['dark', t.dark], ['auto', t.auto]]}
            onChange={(v) => { const el = document.activeElement as HTMLElement; if (el && v !== 'auto' && v !== s.theme) revealTheme(el, () => set({ theme: v })); else set({ theme: v }); }} />, 'theme')}
          {row(t.currency, <Segment label={t.currency} value={s.currency} options={[['toman', t.toman], ['rial', t.rial]]} onChange={(v) => set({ currency: v })} />, 'cur')}
          {sw('alt', t.secondDate, t.secondDateDesc, s.showAlt, () => set({ showAlt: !s.showAlt }))}
          {real && tg && <p className="t-caption muted" style={{ padding: 'var(--space-10) 0 0', display: 'flex', gap: 'var(--space-8)', alignItems: 'center' }}><span className="chip chip--info">{t.telegramOnly}</span>{t.telegramOnlyDesc}</p>}
          {(!real || tg) && sw('m', t.morningBrief, f.time('07:30') + ' · ' + t.morningDesc, s.morning, () => set({ morning: !s.morning }))}
          {(!real || tg) && sw('e', t.eveningReview, f.time('22:00') + ' · ' + t.eveningDesc, s.evening, () => set({ evening: !s.evening }))}
          {!real && sw('fresh', t.previewNew, t.previewNewDesc, s.fresh, () => useData.getState().setFresh(!s.fresh))}
        </Card>
        {real ? (
          <Card as="div" className="list" aria-label={t.deleteAccount}>
            <div className="row" style={{ padding: 'var(--space-12) 0', alignItems: 'flex-start' }}>
              <div className="row__body">
                <span className="t-label" style={{ fontWeight: 600, color: 'var(--c-status-danger)' }}>{t.deleteAccount}</span>
                <span className="t-caption muted">{t.deleteAccountDesc}</span>
              </div>
              <Button variant="secondary" size="sm" style={{ color: 'var(--c-status-danger)' }} onClick={() => { if (window.confirm(t.deleteConfirm)) useAuth.getState().deleteAccount().catch(() => ui.notify(t.deleteFailed)); }}>{t.deleteShort}</Button>
            </div>
          </Card>
        ) : (
          <>
            <TextButton small style={{ alignSelf: 'flex-start' }} onClick={() => ui.setSplash(true)}>{t.replaySplash}</TextButton>
            <TextButton small style={{ alignSelf: 'flex-start', color: 'var(--c-status-danger)' }} onClick={reset}>{t.resetData}</TextButton>
          </>
        )}
      </div>
    </main>
  );
}
