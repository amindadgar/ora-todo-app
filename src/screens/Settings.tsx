import { useRef } from 'react';
import { useData, exportJson, importJson, clearState } from '../data/store';
import { useUI } from '../data/ui';
import { useNav } from '../data/nav';
import { useI18n } from '../i18n';
import { PageHeader } from '../components/Navigation';
import { Segment, Toggle } from '../components/Selection';
import { TextButton } from '../components/Buttons';
import { Card } from '../components/Cards';
import { useCalMode } from './Home';
import { revealTheme } from '../interactions/themeReveal';

export function SettingsScreen() {
  const f = useI18n(); const { t } = f; const ui = useUI(); const nav = useNav(); const mode = useCalMode();
  const { settings: s, setSettings: set } = useData(); const file = useRef<HTMLInputElement>(null);
  const row = (label: string, ctl: React.ReactNode, key: string) => <div key={key} className="row" style={{ justifyContent: 'space-between', padding: 'var(--space-10) 0' }}><span className="t-label" style={{ fontWeight: 400 }}>{label}</span>{ctl}</div>;
  const sw = (id: string, label: string, sub: string, on: boolean, flip: () => void) => (
    <div key={id} className="row" style={{ padding: 'var(--space-10) 0' }}>
      <div className="row__body"><span id={'sw-' + id} className="t-label" style={{ fontWeight: 400 }}>{label}</span><span className="t-caption muted">{sub}</span></div>
      <Toggle checked={on} onChange={flip} labelledBy={'sw-' + id} />
    </div>
  );
  const reset = () => {
    const snap = useData.getState().snapshot(); void clearState(); useData.getState().resetToSamples(); ui.notify(t.sampleRestored, { undo: snap });
  };
  return (
    <main aria-label={t.settings} className="narrow">
      <PageHeader title={t.settings} onBack={nav.back} backLabel={t.back} />
      <div className="screen screen--flush">
        <Card as="div" className="list">
          {row(t.language, <Segment label={t.language} value={s.lang} options={[['fa', t.persian], ['en', t.english]]} onChange={(v) => set({ lang: v, calMode: null })} />, 'lang')}
          {row(t.mainCalendar, <Segment label={t.mainCalendar} value={mode} options={[['j', t.jalali], ['g', t.gregorian]]} onChange={(v) => set({ calMode: v })} />, 'cal')}
          {row(t.theme, <Segment label={t.theme} value={s.theme} options={[['light', t.light], ['dark', t.dark], ['auto', t.auto]]}
            onChange={(v) => { const el = document.activeElement as HTMLElement; if (el && v !== 'auto' && v !== s.theme) revealTheme(el, () => set({ theme: v })); else set({ theme: v }); }} />, 'theme')}
          {row(t.currency, <Segment label={t.currency} value={s.currency} options={[['toman', t.toman], ['rial', t.rial]]} onChange={(v) => set({ currency: v })} />, 'cur')}
          {sw('alt', t.secondDate, t.secondDateDesc, s.showAlt, () => set({ showAlt: !s.showAlt }))}
          {sw('m', t.morningBrief, f.time('07:30'), s.morning, () => set({ morning: !s.morning }))}
          {sw('e', t.eveningReview, f.time('22:00'), s.evening, () => set({ evening: !s.evening }))}
          {sw('fresh', t.previewNew, t.previewNewDesc, s.fresh, () => useData.getState().setFresh(!s.fresh))}
        </Card>
        <TextButton small style={{ alignSelf: 'flex-start' }} onClick={() => ui.setSplash(true)}>{t.replaySplash}</TextButton>
        <TextButton small style={{ alignSelf: 'flex-start', color: 'var(--c-status-danger)' }} onClick={reset}>{t.resetData}</TextButton>
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
