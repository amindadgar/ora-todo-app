import type { MenuAction } from '../components/Lists';
import type { Dict } from '../i18n/dict';
import { removeFrom, shiftOneDay } from '../data/actions';
import type { EditKind } from '../data/ui';

/** Edit / one-day-later / delete — the desktop equivalent of long-press + swipe. */
export function rowActions(t: Dict, kind: EditKind, id: string, openEdit: (k: EditKind, id: string) => void, canShift = false): MenuAction[] {
  const a: MenuAction[] = [{ id: 'edit', label: t.edit, icon: 'edit', run: () => openEdit(kind, id) }];
  if (canShift) a.push({ id: 'later', label: t.oneDayLater, icon: 'clock', run: () => shiftOneDay(kind as 'items', id) });
  a.push({ id: 'del', label: t.delete, icon: 'trash', danger: true, run: () => removeFrom(kind, id) });
  return a;
}
