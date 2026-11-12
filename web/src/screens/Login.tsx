import { useCallback } from 'react';
import { useAuth } from '../data/auth';
import { useI18n } from '../i18n';
import { Logo } from '../components/Brand';
import { Icon } from '../components/Icon';
import { GoogleButton } from '../components/GoogleButton';
import { HeaderActions } from '../components/HeaderActions';
import { Credits } from '../components/Credits';
import { InstallLink } from '../components/InstallUI';

/** Sign-in with Google only (the demo data stays reachable internally for tests via ?guest=1). */
export function Login() {
  const { t, lang } = useI18n(); const auth = useAuth();
  const onCredential = useCallback((c: string) => useAuth.getState().signInWithCredential(c), []);
  void auth;
  return (
    <main className="login" aria-labelledby="login-h">
      <div className="login__top"><HeaderActions /></div>
      <div className="login__card">
        <div style={{ color: 'var(--c-brand-primary)' }}><Logo size={56} /></div>
        <div className="stack" style={{ gap: 'var(--space-8)' }}>
          <h1 id="login-h" className="t-title">{t.loginTitle}</h1>
          <p className="t-body muted" style={{ lineHeight: 1.7 }}>{t.loginSub}</p>
        </div>
        <ul className="login__points">{t.loginPoints.map((p, i) => <li key={i} className="t-body"><span className="dot" aria-hidden="true"><Icon name={(['check', 'calendar', 'clock'] as const)[i]} size={18} stroke={2} /></span>{p}</li>)}</ul>
        <div className="stack" style={{ gap: 'var(--space-12)', alignItems: 'stretch' }}>
          <GoogleButton label={t.continueGoogle} setupHint={t.googleSetup} failedLabel={t.googleFailed} lang={lang} onCredential={onCredential} />
        </div>
        <p className="t-caption muted">{t.localNote}</p>
        <InstallLink t={t} />
      </div>
      <Credits t={t} className="login__credit" />
    </main>
  );
}
