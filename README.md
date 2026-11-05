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

`?guest=1` skips the login (demo data) · `?today=2026-10-06` fixes "today" · `&lang=fa|en` · `&theme=light|dark|auto` · `&splash=0` skips the welcome screen.

## Sign-in and accounts

On first launch Ora shows a login screen:

* **Try it with demo data** — exactly the sample data from the design (tasks, money, goals…).
* **Continue with Google** — a real account that starts **empty** (no demo data at all). Greeting uses the account's first name.

Each account has its own storage on the device (IndexedDB namespace), so switching accounts never mixes data, and signing out keeps
everything for next time. Settings → *Account* shows who is signed in and has *Sign out* / *Sign in with Google*.

**Enabling Google sign-in** (needs a Google OAuth client ID; I can't create one for you):

1. Google Cloud Console → *APIs & Services → Credentials → Create credentials → OAuth client ID → Web application*.
2. Add your origins (e.g. `http://localhost:5173` and your production URL) to *Authorized JavaScript origins*.
3. `cp .env.example .env.local`, set `VITE_GOOGLE_CLIENT_ID=<your id>.apps.googleusercontent.com`, restart `npm run dev`.

Without a client ID the Google button shows a setup hint and the demo path keeps working.

> **Security note.** Ora is local-first with no backend, so the Google ID token is only read in the browser to get the name/email/photo and to
> label the local data namespace; its signature is *not* verified (the audience, issuer and expiry are checked). Accounts are therefore not a security
> boundary against someone using the same browser profile, and data is **not synced** between devices. If you add a server later, verify the
> token there. For tests, `npm run dev` supports `?mockGoogle=<id>` to sign in as a fake account (removed from production builds).

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
* `node e2e/login.cjs` (dev server running) — login screen, demo vs Google (empty), account isolation, sign-out, clear data, reload persistence, Persian/phone layout.
* `node e2e/flows.cjs` (dev server running) — add/undo, menus, right-click, keyboard, wheel, language switch + RTL, persistence,
  swipe, long-press, sheet drag.
* `node scripts/shots.cjs <dir>` and `node scripts/shots-states.cjs <dir>` — screenshots at 390 / 834 / 1440 px.
