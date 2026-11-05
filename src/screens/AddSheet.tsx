import { useState } from 'react';
import { useData } from '../data/store';
import { useUI, type AddPreset, type Screen } from '../data/ui';
import { useCal } from '../data/calState';
import { useI18n } from '../i18n';
import { today, monthOffset } from '../lib/calendar';
import { parseEntry, applyMeridiem, detectType, categoryOf, type EntryType } from '../lib/parser';
import { toLatinDigits } from '../lib/digits';
import { Sheet } from '../components/Feedback';
import { SmartInput, DetectionCard, TypeTile, PillOption } from '../components/Inputs';
import { Button } from '../components/Buttons';
import { Icon } from '../components/Icon';
import { buzz } from '../interactions/haptics';
import { useCalMode } from './Home';
import type { IconName } from '../tokens/tokens';
import type { Item } from '../data/types';

const TYPE_ICON: Record<EntryType, IconName> = { task: 'task', event: 'calendar', reminder: 'reminder', important: 'star', expense: 'expense', income: 'income', bill: 'bill', saving: 'money', wish: 'heart', goal: 'goal' };
const GROUPS: [keyof import('../i18n/dict').Dict['groups'], EntryType[]][] = [['plan', ['task', 'event', 'reminder', 'important']], ['money', ['expense', 'income', 'bill', 'saving']], ['forMe', ['wish', 'goal']]];
const DEST: Record<EntryType, 'calendar' | 'home' | 'key-dates' | 'money' | 'wishlist' | 'goals'> = { task: 'calendar', event: 'calendar', reminder: 'home', important: 'key-dates', expense: 'money', income: 'money', bill: 'money', saving: 'money', wish: 'wishlist', goal: 'goals' };
const DEST_KEY = { calendar: 'cal', home: 'home', 'key-dates': 'events', money: 'money', wishlist: 'wish', goals: 'goals' } as const;
const uid = () => 'u' + Date.now().toString(36) + Math.floor(Math.random() * 1e4);

export function AddSheet({ preset, screen }: { preset: AddPreset; screen: Screen }) {
  const f = useI18n(); const { t, fa, N, SEP } = f; const ui = useUI(); const cal = useCal(); const mode = useCalMode(); const T = today();
  const [text, setText] = useState(preset.text || ''); const [manual, setManual] = useState<EntryType | null>(preset.type ?? null);
  const [ampm, setAmpm] = useState<'am' | 'pm' | null>(null); const [listening, setListening] = useState(false); const [ok, setOk] = useState(false);

  const raw = parseEntry(text, T, fa); const { parsed: P, chosen } = applyMeridiem(raw, ampm);
  const type = manual || detectType(text, raw);
  const day = raw.day ?? preset.day ?? null; const dateJ = day ?? T;
  const isMoney = ['expense', 'income', 'bill', 'saving'].includes(type), noDate = ['wish', 'goal', 'saving'].includes(type), hasTime = ['task', 'event', 'reminder'].includes(type);
  const title = P.title; const target = (toLatinDigits(text).match(/\d+/) || [null])[0];
  const dest = type === 'task' && dateJ === T ? 'home' : DEST[type];
  const destName = type === 'task' && dateJ === T ? t.dest.todays : t.dest[DEST_KEY[dest]];

  const rows: { icon: IconName; text: string; sub: string }[] = [];
  if (!noDate) rows.push({ icon: 'calendar', text: (dateJ === T ? t.todayComma : dateJ === T + 1 ? t.tomorrowComma : '') + f.fullLabel(dateJ), sub: fa ? f.gLabel(dateJ) : f.jLabel(dateJ, true) });
  if (hasTime) rows.push({ icon: 'clock', text: P.time ? f.time(P.time) : t.noTime, sub: '' });
  if (type === 'important') rows.push({ icon: 'bill', text: t.repeatsYear, sub: '' });
  if (type === 'bill') rows.push({ icon: 'bill', text: t.repeatsMonth, sub: '' });
  if (isMoney) rows.push({ icon: 'money', text: P.amount ? f.money(P.amount) : t.addAmount, sub: type === 'saving' ? t.targetAmount : '' });
  if (type === 'expense') rows.push({ icon: 'more', text: t.category + t.cats[categoryOf(text)], sub: '' });
  if (type === 'goal') rows.push({ icon: 'goal', text: target ? t.target + N(target) : t.addTarget, sub: '' });

  // highlight segments: the parser's `marks` are Latin-digit substrings (same length as the raw text)
  const lat = toLatinDigits(text), used: [number, number][] = [];
  raw.marks.forEach((m) => { const i = lat.indexOf(m); if (i >= 0) used.push([i, i + m.length]); });
  used.sort((a, b) => a[0] - b[0]);
  const segments: { t: string; hl: boolean }[] = []; let pos = 0;
  used.forEach(([a, b]) => { if (a < pos) return; if (a > pos) segments.push({ t: text.slice(pos, a), hl: false }); segments.push({ t: text.slice(a, b), hl: true }); pos = b; });
  if (pos < text.length) segments.push({ t: text.slice(pos), hl: false });

  const save = () => {
    const s = useData.getState(), snap = s.snapshot(), id = uid();
    if (type === 'wish') s.mutate('wishes', (l) => [{ id, title, meta: t.newIdea }, ...l]);
    else if (type === 'important') s.mutate('events', (l) => [...l, { id, title, day: dateJ, yearly: true }]);
    else if (type === 'bill') s.mutate('bills', (l) => [...l, { id, title, day: dateJ, amount: P.amount || 0 }]);
    else if (type === 'saving') s.mutate('savings', (l) => [...l, { id, title, have: 0, target: P.amount || 1000000 }]);
    else if (type === 'goal') s.mutate('goals', (l) => [...l, { id, title, have: 0, target: +(target || 1), unit: '' }]);
    else s.mutate('items', (l) => [...l, { id, type: type as Item['type'], title, day: dateJ, time: hasTime ? P.time || '' : '', ...(P.amount ? { amount: P.amount } : {}), ...(type === 'expense' ? { cat: categoryOf(text) } : {}) }]);
    if (dest === 'calendar') cal.set({ day: dateJ, off: monthOffset(mode, T, dateJ), dir: 0 });
    ui.closeAdd(); ui.notify(t.savedTo + destName, { undo: snap, view: dest === screen ? null : dest });
  };
  const tap = (el: HTMLElement) => {
    if (!title || ok) return; buzz(10); setOk(true);
    let fly: { x: number; y: number; x1: number; y1: number } | null = null; const tab = dest === 'home' ? 'home' : dest === 'calendar' ? 'calendar' : dest === 'money' ? 'money' : 'more';
    try {
      const nav = document.querySelector<HTMLElement>(`[data-nav="${tab}"]`); const b = el.getBoundingClientRect();
      if (nav && nav.offsetParent) { const r = nav.getBoundingClientRect(); fly = { x: b.left + b.width / 2, y: b.top + b.height / 2, x1: r.left + r.width / 2, y1: r.top + 16 }; }
    } catch { fly = null; }
    setTimeout(() => { save(); if (fly) ui.startFly(fly, tab); }, 460);
  };
  const mic = () => {
    if (listening) { setListening(false); return; }
    const demo = fa ? 'فردا ساعت ۱۰ صبح زنگ به دکتر' : 'call the doctor tomorrow 10am';
    const fallback = () => { setListening(true); setTimeout(() => { setListening(false); setText(demo); setManual(null); }, 1500); };
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }; const SRc = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SRc) { fallback(); return; }
    try { const r = new SRc(); r.lang = fa ? 'fa-IR' : 'en-US'; r.interimResults = false; let got = false;
      r.onresult = (e) => { got = true; setText(e.results[0][0].transcript); setListening(false); setManual(null); };
      r.onerror = () => { if (!got) fallback(); }; r.onend = () => { if (got) setListening(false); };
      setListening(true); r.start(); } catch { fallback(); }
  };
  return (
    <Sheet title={t.addTitle} titleId="add-h" closeLabel={t.close} onClose={ui.closeAdd} initialFocus="#qa"
      footer={<Button size="lg" block disabled={!title} onClick={(e) => tap(e.currentTarget)} style={{ background: ok ? 'var(--c-status-success)' : undefined, opacity: title ? 1 : 0.5 }}>
        {ok && <span style={{ animation: 'rz-check .3s ease-out', display: 'flex' }}><Icon name="check" size={18} stroke={2.6} /></span>}{ok ? t.saved : t.saveTo + destName}</Button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
        <label htmlFor="qa" className="t-small muted">{t.addHint}</label>
        <SmartInput id="qa" value={text} onChange={(v) => { setText(v); setAmpm(null); }} placeholder={t.examples[type]} segments={segments} listening={listening} onMic={mic} micLabel={t.micAria} onEnter={() => { const b = document.querySelector<HTMLElement>('.sheet__foot button'); if (b) tap(b); }} />
        {listening && <span role="status" className="t-caption brand" style={{ animation: 'rz-pulse 1.2s infinite' }}>{t.listening}</span>}
      </div>
      <DetectionCard type={t.types[type]} how={manual ? t.yourChoice : t.detectedAuto} title={title || '—'} rows={rows} empty={title ? undefined : t.typeFirst}>
        {raw.ambiguous && hasTime && (
          <div role="radiogroup" aria-label={t.morning} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', flexWrap: 'wrap', paddingInlineStart: 28 }}>
            <span className="t-caption muted">{t.morning}</span>
            {(['am', 'pm'] as const).map((o) => <PillOption key={o} selected={chosen === o} onClick={() => setAmpm(o)}>{(fa ? N(raw.hour ?? '') + ' ' : (raw.hour ?? '') + ' ') + t[o]}</PillOption>)}
          </div>
        )}
      </DetectionCard>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
        <span className="t-small" style={{ fontWeight: 600 }}>{t.wrongType}</span>
        {GROUPS.map(([g, ids]) => (
          <div key={g} role="radiogroup" aria-label={t.groups[g]} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <span className="t-overline muted" style={{ fontWeight: 400, letterSpacing: 0 }}>{t.groups[g]}</span>
            <div className="type-grid">{ids.map((id) => <TypeTile key={id} icon={TYPE_ICON[id]} label={t.types[id]} selected={id === type} onClick={() => setManual(id)} />)}</div>
          </div>
        ))}
      </div>
      <span className="sr-only">{SEP}</span>
    </Sheet>
  );
}
interface SR { lang: string; interimResults: boolean; start: () => void; onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null }
