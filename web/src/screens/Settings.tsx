import { useRef } from 'react';
import { useData, exportJson, importJson, clearState } from '../data/store';
import { useUI } from '../data/ui';
import { useNav } from '../data/nav';
import { useAuth } from '../data/auth';
import { initials } from '../lib/auth';
import { useSyncStatus } from '../data/sync';
import { TelegramRow } from '../components/TelegramRow';
import { useI18n } from '../i18n';
import { PageHeader } from '../components/Navigation';
import { Segment, Toggle } from '../components/Selection';
import { TextButton, Button } from '../components/Buttons';
import { Card } from '../components/Cards';
import { useCalMode } from './Home';
import { revealTheme } from '../interactions/themeReveal';

export function SettingsScreen() {
  const f = useI18n(); const { t } = f; const ui = useUI(); const nav = useNav(); const mode = useCalMode();
  const { mode: authMode, user } = useAuth(); const real = authMode === 'google'; const sync = useSyncStatus();
  const { settings: s, setSettings: set } = useData(); const file = useRef<HTMLInputElement>(null);
  const row = (label: string, ctl: React.ReactNode, key: string) => <div key={key} className="row" style={{ justifyContent: 'space-between', padding: 'var(--space-10) 0' }}><span className="t-label" style={{ fontWeight: 400 }}>{label}</span>{ctl}</div>;
  const sw = (id: string, label: string, sub: string, on: boolean, flip: () => void) => (
    <div key={id} className="row" style={{ padding: 'var(--space-10) 0' }}>
      <div className="row__body"><span id={'sw-' + id} className="t-label" style={{ fontWeight: 400 }}>{label}</span><span className="t-caption muted">{sub}</span></div>
      <Toggle checked={on} onChange={flip} labelledBy={'sw-' + id} />
    </div>
  );
  const reset = () => {
    const snap = useData.getState().snapshot();
    if (real) { useData.getState().clearAll(); ui.notify(t.dataCleared, { undo: snap }); return; }   // a real account never gets demo data
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
          {real && <TelegramRow t={t} lang={s.lang} />}
          {row(t.language, <Segment label={t.language} value={s.lang} options={[['fa', t.persian], ['en', t.english]]} onChange={(v) => set({ lang: v, calMode: null })} />, 'lang')}
          {row(t.mainCalendar, <Segment label={t.mainCalendar} value={mode} options={[['j', t.jalali], ['g', t.gregorian]]} onChange={(v) => set({ calMode: v })} />, 'cal')}
          {row(t.theme, <Segment label={t.theme} value={s.theme} options={[['light', t.light], ['dark', t.dark], ['auto', t.auto]]}
            onChange={(v) => { const el = document.activeElement as HTMLElement; if (el && v !== 'auto' && v !== s.theme) revealTheme(el, () => set({ theme: v })); else set({ theme: v }); }} />, 'theme')}
          {row(t.currency, <Segment label={t.currency} value={s.currency} options={[['toman', t.toman], ['rial', t.rial]]} onChange={(v) => set({ currency: v })} />, 'cur')}
          {sw('alt', t.secondDate, t.secondDateDesc, s.showAlt, () => set({ showAlt: !s.showAlt }))}
          {sw('m', t.morningBrief, f.time('07:30'), s.morning, () => set({ morning: !s.morning }))}
          {sw('e', t.eveningReview, f.time('22:00'), s.evening, () => set({ evening: !s.evening }))}
          {!real && sw('fresh', t.previewNew, t.previewNewDesc, s.fresh, () => useData.getState().setFresh(!s.fresh))}
        </Card>
        <TextButton small style={{ alignSelf: 'flex-start' }} onClick={() => ui.setSplash(true)}>{t.replaySplash}</TextButton>
        <TextButton small style={{ alignSelf: 'flex-start', color: 'var(--c-status-danger)' }} onClick={reset}>{real ? t.clearMyData : t.resetData}</TextButton>
        {real && <TextButton small style={{ alignSelf: 'flex-start', color: 'var(--c-status-danger)' }} onClick={() => { if (window.confirm(t.deleteConfirm)) useAuth.getState().deleteAccount().catch(() => ui.notify(t.deleteFailed)); }}>{t.deleteAccount}</TextButton>}
        <div style={{ display: 'flex', gap: 'var(--space-12)', flexWrap: 'wrap' }}>
          <TextButton small onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([exportJson()], { type: 'application/json' })); a.download = 'ora-backup.json'; a.click(); URL.revokeObjectURL(a.href); }}>{t.exportData}</TextButton>
          <TextButton small onClick={() => file.current?.click()}>{t.importData}</TextButton>
          <input ref={file} type="file" accept="application/json" hidden onChange={async (e) => { const fl = e.target.files?.[0]; if (!fl) return; ui.notify(importJson(await fl.text()) ? t.imported : t.importFailed); e.target.value = ''; }} />
        </div>
        <p className="t-overline muted" style={{ fontWeight: 400, letterSpacing: 0, lineHeight: 1.8 }}>{t.holidayNote}</p>
        <p className="t-overline muted" style={{ fontWeight: 400, letterSpacing: 0 }}>{t.shortcuts}: {t.shortcutsDesc}</p>
      </div>
    </main>
  );
}
