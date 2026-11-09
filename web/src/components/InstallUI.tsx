import { useEffect, useState } from 'react';
import { useInstall } from '../data/install';
import { useUI } from '../data/ui';
import { isInApp, isIos } from '../lib/install';
import { Button, IconButton, TextButton } from './Buttons';
import { Sheet } from './Feedback';
import { Icon } from './Icon';
import type { Dict } from '../i18n/dict';

const useMedia = (q: string) => {
  const [m, setM] = useState(() => { try { return window.matchMedia(q).matches; } catch { return false; } });
  useEffect(() => { try { const mq = window.matchMedia(q); const f = () => setM(mq.matches); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f); } catch { return undefined; } }, [q]);
  return m;
};

/** Install button action: the native prompt where there is one, otherwise the instructions sheet. */
export function useInstallAction(t: Dict) {
  const ui = useUI(); const hasPrompt = useInstall((s) => !!s.deferred);
  return {
    label: hasPrompt ? t.installNow : t.installHow,
    run: async () => { const r = await useInstall.getState().install(); if (r === 'help') ui.setInstallHelp(true); else if (r === 'accepted') ui.notify(t.installAccepted); }
  };
}

/** Banner for phones/tablets (touch devices): shown until installed or closed (then hidden for two weeks). */
export function InstallBanner({ t }: { t: Dict }) {
  const show = useInstall((s) => s.showBanner()); const touch = useMedia('(hover: none), (max-width: 767px)'); const act = useInstallAction(t);
  if (!show || !touch) return null;
  return (
    <div className="install o-soft" role="region" aria-label={t.installTitle}>
      <img src="/icon-192.png" alt="" width={44} height={44} className="install__icon" />
      <div className="install__text"><span className="t-label" style={{ fontWeight: 600 }}>{t.installTitle}</span><span className="t-caption muted">{t.installSub}</span></div>
      <Button size="sm" onClick={() => void act.run()}>{act.label}</Button>
      <IconButton icon="close" size={16} kind="muted" label={t.installNotNow} onClick={() => useInstall.getState().dismiss()} style={{ width: 36, height: 36, border: 'none', background: 'transparent' }} />
    </div>
  );
}

/** Settings row (always available while installable). */
export function InstallRow({ t }: { t: Dict }) {
  const eligible = useInstall((s) => s.eligible()); const act = useInstallAction(t);
  if (!eligible) return null;
  return (
    <div className="row" style={{ padding: 'var(--space-12) 0', alignItems: 'flex-start' }} data-testid="install-row">
      <div className="row__body" style={{ minWidth: 0, gap: 'var(--space-2)' }}><span className="t-label" style={{ fontWeight: 600 }}>{t.installRowTitle}</span><span className="t-caption muted">{t.installRowDesc}</span></div>
      <Button variant="secondary" size="sm" onClick={() => void act.run()}>{act.label}</Button>
    </div>
  );
}

/** Small link for the login screen. */
export function InstallLink({ t }: { t: Dict }) {
  const eligible = useInstall((s) => s.eligible()); const act = useInstallAction(t);
  if (!eligible) return null;
  return <TextButton small icon="download" style={{ alignSelf: 'center' }} onClick={() => void act.run()}>{t.installTitle}</TextButton>;
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return <ol className="steps">{items.map((s, i) => <li key={i}><span className="steps__n" aria-hidden="true">{i + 1}</span><span className="t-body" style={{ fontWeight: 400, lineHeight: 1.6 }}>{s}</span></li>)}</ol>;
}

/** Step-by-step instructions for the platform we detected. */
export function InstallHelp({ t }: { t: Dict }) {
  const open = useUI((s) => s.installHelp); const platform = useInstall((s) => s.platform); const ui = useUI(); const [copied, setCopied] = useState(false);
  if (!open) return null;
  const copy = async () => { try { await navigator.clipboard.writeText(location.origin); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ } };
  const share = <Icon name="share" size={18} className="brand" />;
  let body: React.ReactNode;
  if (isInApp(platform)) body = (<><p className="t-body" style={{ lineHeight: 1.7 }}>{t.installInApp}</p><Button variant="secondary" icon="link" onClick={() => void copy()}>{copied ? t.installCopied : t.installCopy}</Button></>);
  else if (isIos(platform)) body = (<><Steps items={[<>{t.installIos1} {share}</>, t.installIos2, t.installIos3]} />{platform === 'ios-other' && <p className="t-caption muted">{t.installIosChrome}</p>}</>);
  else if (platform === 'android-chromium' || platform === 'android-other') body = <Steps items={[t.installAndroid1, t.installAndroid2, t.installAndroid3]} />;
  else if (platform === 'desktop-safari') body = <Steps items={[t.installDesktopSafari]} />;
  else body = <Steps items={[t.installDesktopChromium]} />;
  return (
    <Sheet title={t.installHelpTitle} titleId="install-h" closeLabel={t.close} onClose={() => ui.setInstallHelp(false)}>
      {body}
      {!isInApp(platform) && <p className="t-caption muted">{t.installDone}</p>}
    </Sheet>
  );
}
