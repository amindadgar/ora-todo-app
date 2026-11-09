import { useEffect, useState } from 'react';
import { today } from './lib/calendar';
import { useData } from './data/store';
import { useUI, type Screen } from './data/ui';
import { useRoute } from './data/route';
import { NavCtx } from './data/nav';
import { useAuth } from './data/auth';
import { Login } from './screens/Login';
import { useShortcuts } from './interactions/useShortcuts';
import { MoreMenu } from './components/MoreMenu';
import { HelpDialog } from './components/HelpDialog';
import { AddSheet } from './screens/AddSheet';
import { EditSheet } from './screens/EditSheet';
import { KeyDatesScreen } from './screens/KeyDates';
import { WishlistScreen } from './screens/Wishlist';
import { GoalsScreen } from './screens/Goals';
import { SettingsScreen } from './screens/Settings';
import { useI18n, useDocumentSettings } from './i18n';
import { TabBar, SideNav, type NavDef } from './components/Navigation';
import { Toast, Confetti } from './components/Feedback';
import { Splash } from './components/Splash';
import { HeaderActions } from './components/HeaderActions';
import { Credits } from './components/Credits';
import { InstallHelp } from './components/InstallUI';
import { Home } from './screens/Home';
import { CalendarScreen } from './screens/Calendar';
import { MoneyScreen } from './screens/Money';

export function App({ skipSplash }: { skipSplash?: boolean }) {
  useDocumentSettings();
  const f = useI18n(); const { t } = f; const ui = useUI(); const [screen, go, back] = useRoute(); useShortcuts(go);
  const settings = useData((s) => s.settings);
  // re-render when the calendar day changes while the app stays open
  // the home-screen shortcut opens /?add=1 → straight to the Add sheet (once, for a signed-in user)
  const mode0 = useAuth((a) => a.mode);
  useEffect(() => {
    if (mode0 === null) return; const q = new URLSearchParams(location.search);
    if (q.has('add')) { q.delete('add'); history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); useUI.getState().openAdd(); }
  }, [mode0]);
  const [, setDay] = useState(today());
  useEffect(() => { const i = setInterval(() => setDay(today()), 30000); return () => clearInterval(i); }, []);
  useEffect(() => { if (skipSplash) ui.setSplash(false); }, [skipSplash]);   // eslint-disable-line react-hooks/exhaustive-deps

  const tabs: NavDef[] = [
    { id: 'home', label: t.home, icon: 'home' }, { id: 'calendar', label: t.calendar, icon: 'calendar' }, { id: 'add', label: t.add, icon: 'add' },
    { id: 'money', label: t.money, icon: 'money' }, { id: 'more', label: t.more, icon: 'more' }
  ];
  const active = ui.moreOpen ? 'more' : (['home', 'calendar', 'money'].includes(screen) ? screen : 'more');
  const select = (id: NavDef['id']) => { if (id === 'more') ui.setMore(!ui.moreOpen); else if (id === 'add') ui.openAdd(); else { ui.setMore(false); go(id); } };
  const side = (id: Screen, label: string, icon: NavDef['icon'] | 'star' | 'heart' | 'goal' | 'settings', kbd?: string) => ({ id, label, icon: icon as never, kbd });
  void settings;
  const mode = useAuth((a) => a.mode);
  if (mode === null) return (<>{<Login />}<InstallHelp t={t} />{ui.splash && <Splash tagline={t.tagline} label={t.skipSplash} onDone={() => ui.setSplash(false)} />}</>);
  return (
    <NavCtx.Provider value={{ screen, go, back }}>
    <div className="shell">
      <SideNav label={t.menuAria} active={screen} onSelect={go} onAdd={() => ui.openAdd()} addLabel={t.add}
        primary={[side('home', t.home, 'home'), side('calendar', t.calendar, 'calendar'), side('money', t.money, 'money')]}
        secondary={[side('key-dates', t.keyDates, 'star'), side('wishlist', t.wishlist, 'heart'), side('goals', t.goals, 'goal'), side('settings', t.settings, 'settings')]}
        footer={<><HeaderActions /><Credits t={t} /></>} />
      <div className="shell__body">
        <div className="shell__scroll"><div className="page" key={screen}>
          {screen === 'home' && <Home go={go} />}
          {screen === 'calendar' && <CalendarScreen />}
          {screen === 'money' && <MoneyScreen />}
          {screen === 'key-dates' && <KeyDatesScreen />}
          {screen === 'wishlist' && <WishlistScreen />}
          {screen === 'goals' && <GoalsScreen />}
          {screen === 'settings' && <SettingsScreen />}
        </div></div>
        <TabBar label={t.menuAria} items={tabs} active={active} bumped={ui.bump} onSelect={select} />
      </div>
      {ui.toast && <Toast msg={ui.toast.msg} undoLabel={t.undo} viewLabel={t.view} onUndo={ui.toast.undo ? ui.doUndo : undefined} onView={ui.toast.view ? () => { go(ui.toast!.view!); ui.dismissToast(); } : undefined} />}
      {ui.celebrate && <Confetti />}
      {ui.moreOpen && <MoreMenu title={t.moreTitle} closeLabel={t.close} onClose={() => ui.setMore(false)} items={[
        { label: t.keyDates, desc: t.keyDatesDesc, icon: 'star', go: () => { ui.setMore(false); go('key-dates'); } }, { label: t.wishlist, desc: t.wishlistDesc, icon: 'heart', go: () => { ui.setMore(false); go('wishlist'); } },
        { label: t.goals, desc: t.goalsDesc, icon: 'goal', go: () => { ui.setMore(false); go('goals'); } }, { label: t.settings, desc: t.settingsDesc, icon: 'settings', go: () => { ui.setMore(false); go('settings'); } }]} />}
      {ui.addOpen && <AddSheet preset={ui.addOpen} screen={screen} />}
      {ui.edit && <EditSheet kind={ui.edit.kind} id={ui.edit.id} />}
      <InstallHelp t={t} />
      {ui.help && <HelpDialog t={t} onClose={() => ui.setHelp(false)} />}
      {ui.fly && <div className="fly" aria-hidden="true" style={{ left: ui.fly.x, top: ui.fly.y, transform: `translateX(${ui.fly.go ? ui.fly.x1 - ui.fly.x : 0}px)`, transition: ui.fly.go ? 'transform .58s cubic-bezier(.3,.1,.5,1)' : 'none' }}>
        <span className="fly__dot" style={{ transform: `translateY(${ui.fly.go ? ui.fly.y1 - ui.fly.y : 0}px) scale(${ui.fly.go ? 0.6 : 1})`, transition: ui.fly.go ? 'transform .58s cubic-bezier(.6,-.35,.8,.6)' : 'none' }} />
      </div>}
      {ui.splash && <Splash tagline={t.tagline} label={t.skipSplash} onDone={() => ui.setSplash(false)} />}
    </div>
    </NavCtx.Provider>
  );
}
