# Ora

A calm, bilingual daily planner — English (LTR) and Persian (RTL, Vazirmatn, Persian digits), light and dark themes, Jalali + Gregorian calendars.
One codebase, installable as a PWA, works on phones, tablets and desktop.

**Design:** Yeganeh Akbari — [Behance](https://www.behance.net/yeganehakbarish) · [Dribbble](https://dribbble.com/yeganeh-akbari-sh)
**Implementation:** Amin Dadgar

## Run it

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # type-check + production build + service worker
npm run preview    # serve the production build on your network
npm test           # unit tests (parser, calendar, reports, free-time)
```

### Open it on a phone

1. Run `npm run dev` (or `npm run preview`) on your computer; both listen on your network (`--host`).
2. Put the phone on the same Wi-Fi and open the **Network** URL printed in the terminal (e.g. `http://192.168.1.20:5173`).
3. To install it: iOS Safari → Share → *Add to Home Screen*; Android Chrome → menu → *Install app*.
   Installing and offline use need HTTPS (service workers), so for a real install deploy the `dist/` folder to any static host
   (Vercel, Netlify, GitHub Pages, …). Everything is static; there is no backend.

### Useful URL parameters (testing / screenshots)

`?today=2026-10-06` fixes "today" · `&lang=fa|en` · `&theme=light|dark|auto` · `&splash=0` skips the welcome screen.

## Responsive behaviour

| Width | Navigation | Layout | Add / Edit |
|---|---|---|---|
| < 768 px (phone) | bottom tab bar + *More* drawer | exactly the prototype, single column | bottom sheet, drag down to dismiss |
| 768–1199 px (tablet) | bottom tab bar | wider, max 880 px; two columns where useful | centred dialog |
| ≥ 1200 px (desktop) | sidebar (mirrors in RTL) | multi-column, max 1160 px | centred dialog |

Touch ↔ mouse/keyboard equivalents: swipe/long-press ↔ ⋯ menu + right-click · bottom-sheet drag ↔ Esc/close button ·
month swipe ↔ arrows, PageUp/PageDown, mouse wheel.

**Keyboard:** `N` new · `T` today (calendar) · `?` help · `Esc` close · calendar: `←→↑↓` days, `PgUp/PgDn` months, `Home/End` month edges.

## How it is built

```
src/
  tokens/        tokens.ts (transcribed from the Figma plugin) → css.ts generates CSS custom properties
  i18n/          dict.ts (all copy, EN+FA), format.ts (digits, dates, money), index.tsx (dir/lang/theme)
  lib/           calendar.ts (jalaali-js), parser.ts (smart input), report.ts, suggest.ts, digits.ts
  data/          types, seed, store (zustand), persist (IndexedDB), actions (undo-able), ui, route
  components/    one file per design-system family (Buttons, Chips, Selection, Inputs, Progress, Navigation,
                 Calendar, Lists, Money, Cards, Feedback, Brand) + Icon, Splash, MoreMenu
  interactions/  swipe row, sheet drag, month swipe, count-up, theme reveal, shortcuts, haptics
  screens/       Home, Calendar, Money, KeyDates, Wishlist, Goals, Settings, AddSheet, EditSheet
  styles/        global.css (components), screens.css (layouts) — only token variables, no raw colours
tests/  e2e/  scripts/ (screenshot harness)  docs/ (layout + fidelity comparisons)
```

* **Tokens first.** Colours, type, spacing, radius, elevation and icons come from `tokens.ts`; screens never hard-code them.
  The prototype's half-step spacing (6/10/14/18 px) is kept as explicitly named extra tokens.
* **RTL is real mirroring.** `dir` on `<html>`, CSS logical properties, mirrored chevrons, sidebar and progress fill direction,
  Persian digits and a first-strong isolate around mixed text.
* **Local-first.** Data lives in IndexedDB (localStorage fallback). Settings → *Export a backup (JSON)* / *Import a backup*.
* **Reduced motion** is respected in CSS and in the JS-driven animations (count-up, theme reveal).
* The Jalali calendar uses [`jalaali-js`](https://github.com/jalaali/jalaali-js). Fixed solar holidays are exact; religious holidays are
  data for 1405–1406 only (see below).

## Checks

* `npm test` — parser (EN + FA, Persian digits, relative dates, times, amounts), calendar/Jalali maths, report buckets, free-time logic.
* `node e2e/flows.cjs` (dev server running) — add/undo, menus, right-click, keyboard, wheel, language switch + RTL, persistence,
  swipe, long-press, sheet drag.
* `node scripts/shots.cjs <dir>` and `node scripts/shots-states.cjs <dir>` — screenshots at 390 / 834 / 1440 px.
