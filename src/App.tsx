import { useEffect, useState } from 'react';
import { useData } from './data/store';
import { useUI, type Screen } from './data/ui';
import { useRoute } from './data/route';
import { useI18n, useDocumentSettings } from './i18n';
import { TabBar, SideNav, type NavDef } from './components/Navigation';
import { Toast, Confetti } from './components/Feedback';
import { Splash } from './components/Splash';
import { HeaderActions } from './components/HeaderActions';
import { Home } from './screens/Home';
import { CalendarScreen } from './screens/Calendar';
import { MoneyScreen } from './screens/Money';

export function App({ skipSplash }: { skipSplash?: boolean }) {
  useDocumentSettings();
  const f = useI18n(); const { t } = f; const ui = useUI(); const [screen, go] = useRoute();
  const settings = useData((s) => s.settings);
  useEffect(() => { if (skipSplash) ui.setSplash(false); }, [skipSplash]);   // eslint-disable-line react-hooks/exhaustive-deps
  const [bumped] = useState<string | null>(null);

  const tabs: NavDef[] = [
    { id: 'home', label: t.home, icon: 'home' }, { id: 'calendar', label: t.calendar, icon: 'calendar' }, { id: 'add', label: t.add, icon: 'add' },
    { id: 'money', label: t.money, icon: 'money' }, { id: 'more', label: t.more, icon: 'more' }
  ];
  const active = ui.moreOpen ? 'more' : (['home', 'calendar', 'money'].includes(screen) ? screen : 'more');
  const select = (id: NavDef['id']) => { if (id === 'more') ui.setMore(!ui.moreOpen); else if (id === 'add') ui.openAdd(); else { ui.setMore(false); go(id); } };
  const side = (id: Screen, label: string, icon: NavDef['icon'] | 'star' | 'heart' | 'goal' | 'settings', kbd?: string) => ({ id, label, icon: icon as never, kbd });
  void settings;
  return (
    <div className="shell">
      <SideNav label={t.menuAria} active={screen} onSelect={go} onAdd={() => ui.openAdd()} addLabel={t.add}
        primary={[side('home', t.home, 'home'), side('calendar', t.calendar, 'calendar'), side('money', t.money, 'money')]}
        secondary={[side('key-dates', t.keyDates, 'star'), side('wishlist', t.wishlist, 'heart'), side('goals', t.goals, 'goal'), side('settings', t.settings, 'settings')]}
        footer={<><HeaderActions /><span className="t-micro muted" style={{ fontWeight: 400, lineHeight: 1.5 }}>{t.designCredit}</span></>} />
      <div className="shell__body">
        <div className="shell__scroll"><div className="page" key={screen}>
          {screen === 'home' && <Home go={go} />}
          {screen === 'calendar' && <CalendarScreen />}
          {screen === 'money' && <MoneyScreen />}
          {!['home', 'calendar', 'money'].includes(screen) && <p className="screen muted">…</p>}
        </div></div>
        <TabBar label={t.menuAria} items={tabs} active={active} bumped={bumped} onSelect={select} />
      </div>
      {ui.toast && <Toast msg={ui.toast.msg} undoLabel={t.undo} viewLabel={t.view} onUndo={ui.toast.undo ? ui.doUndo : undefined} onView={ui.toast.view ? () => { go(ui.toast!.view!); ui.dismissToast(); } : undefined} />}
      {ui.celebrate && <Confetti />}
      {ui.splash && <Splash tagline={t.tagline} label={t.skipSplash} onDone={() => ui.setSplash(false)} />}
    </div>
  );
}
