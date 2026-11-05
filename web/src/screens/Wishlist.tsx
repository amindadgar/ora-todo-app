import { useData } from '../data/store';
import { useUI } from '../data/ui';
import { useNav } from '../data/nav';
import { useI18n } from '../i18n';
import { PageHeader } from '../components/Navigation';
import { ListCard, ActionMenu, useActionMenu } from '../components/Lists';
import { TextButton, IconButton } from '../components/Buttons';
import { rowActions } from './common';
import type { Wish } from '../data/types';

function WishRow({ w }: { w: Wish }) {
  const f = useI18n(); const { t } = f; const ui = useUI(); const am = useActionMenu();
  return (
    <div className="row" style={{ gap: 'var(--space-8)', padding: 'var(--space-10) 0' }} onContextMenu={(e) => { e.preventDefault(); am.openAt(e.clientX, e.clientY); }}>
      <button type="button" onClick={() => ui.openEdit('wishes', w.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minHeight: 44, justifyContent: 'center' }}>
        <span className="t-body" style={{ fontWeight: 600 }}>{f.text(w.title)}</span><span className="t-caption muted">{f.text(w.meta)}</span>
      </button>
      <TextButton small onClick={() => ui.openAdd({ text: f.text(w.title) + (f.fa ? ' جمعه' : ' Friday'), type: 'event' })}>{t.planIt}</TextButton>
      <span className="taskrow__more"><IconButton icon="more2" kind="muted" label={t.more_} aria-haspopup="menu" onClick={(e) => am.openAtButton(e.currentTarget)} /></span>
      {am.menu && <ActionMenu actions={rowActions(t, 'wishes', w.id, ui.openEdit)} at={am.menu} onClose={am.close} />}
    </div>
  );
}
export function WishlistScreen() {
  const f = useI18n(); const { t } = f; const ui = useUI(); const nav = useNav(); const wishes = useData((s) => s.wishes);
  return (
    <main aria-label={t.wishlist} className="narrow">
      <PageHeader title={t.wishlist} onBack={nav.back} backLabel={t.back} />
      <div className="screen screen--flush" style={{ gap: 'var(--space-12)' }}>
        <span className="t-small muted" style={{ lineHeight: 1.8 }}>{wishes.length ? t.wishIntro : t.wishEmpty}</span>
        {wishes.length > 0 && <ListCard>{wishes.map((w) => <WishRow key={w.id} w={w} />)}</ListCard>}
        <TextButton style={{ alignSelf: 'flex-start' }} onClick={() => ui.openAdd({ type: 'wish' })}>{t.addWish}</TextButton>
      </div>
    </main>
  );
}
