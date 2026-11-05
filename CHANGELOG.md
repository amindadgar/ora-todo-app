# Changelog

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
