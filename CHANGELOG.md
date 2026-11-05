# Changelog

## 0.2.0 — login flow
- Login screen (EN/FA, light/dark, phone → desktop): *Continue with Google* or *Try it with demo data*.
- Google accounts start empty and are stored in their own on-device namespace; the demo data keeps its original storage and stays unchanged.
- Greeting uses the Google account's first name; demo-only items (year-in-review card, "preview as new user", restore samples) are hidden for real accounts — *Clear my data* empties instead of restoring samples.
- Settings → Account: avatar, name, email, Sign out / Sign in with Google.
- Google Identity Services button when `VITE_GOOGLE_CLIENT_ID` is set; setup hint otherwise. Dev-only `?mockGoogle=<id>` test hook.
- Tests: 44 unit tests (incl. token decoding/validation) + login end-to-end script.

## 0.1.0 — first complete build
- Project: Vite + React + TypeScript PWA (installable, offline shell), self-hosted Figtree + Vazirmatn.
- Tokens transcribed from the Ora Design System v2.3 plugin (light + dark), type scale, spacing, radius, elevation, icons.
- English/Persian copy, Persian digits, RTL mirroring at every breakpoint.
- Responsive shell: phone (prototype), tablet, desktop with mirrored sidebar.
- Screens: Home, Add sheet (smart input), Edit sheet, Calendar (Jalali + Gregorian), Money, More, Key dates, Wishlist, Goals, Settings.
- Interactions: swipe complete/delete with undo, long-press edit, sheet drag-to-dismiss, month swipe, count-up/chart grow,
  strike-through, confetti, +1 floats, save-to-tab fly, circular theme reveal, splash; desktop ⋯ menus, right-click, shortcuts, wheel.
- Smart-input parser (EN/FA), Jalali calendar via jalaali-js, free-time suggestion, report charts computed from real completions.
- Data: IndexedDB, JSON export/import, undoable edits, sample data generated for the real current date.
- Tests: 39 unit tests + end-to-end interaction script.

### Differences from the prototype (intentional)
- "Today" is the real date (prototype was fixed at 6 Oct 2026); samples are generated relative to it.
- Goals charts are computed from completed tasks; the "year in review" card keeps the prototype's demo numbers.
- English expense categories recognise more words (fruit, bread, coffee…).
- Added Export/Import backup in Settings (new strings).
