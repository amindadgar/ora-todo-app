/**
 * Ora design tokens — transcribed 1:1 from Ora-Design-System-v2.3/code.js
 * (PRIM, SEM, SPACE, RADIUS, TYPE, elevation). Do not hand-edit values here
 * without updating the design system.
 */

export const primitives = {
  'blue-50': '#E4F0FB', 'blue-100': '#A9D3F7', 'blue-200': '#9CCBF5', 'blue-300': '#7DB8EE',
  'blue-500': '#2E74BA', 'blue-700': '#1F5A93', 'blue-800': '#1F3650', 'blue-900': '#1A2D40', 'blue-950': '#0B1B2B',
  'neutral-0': '#FFFFFF', 'neutral-25': '#F4F8FC', 'neutral-50': '#E6EEF6', 'neutral-100': '#E3EAF2',
  'neutral-400': '#9AACBE', 'neutral-500': '#5A6B7D', 'neutral-700': '#263342', 'neutral-800': '#17212B',
  'neutral-900': '#1C2B3A', 'neutral-950': '#0F1720',
  'green-300': '#7FD3A4', 'green-700': '#2E7D55', 'red-300': '#F2A08B', 'red-700': '#B54A33', 'amber-400': '#F2B84B',
  'neutral-scrim': 'rgba(15, 23, 32, 0.4)'
} as const;
type Prim = keyof typeof primitives;

/** semantic token -> [light primitive, dark primitive] */
export const semantic = {
  'bg-canvas': ['neutral-25', 'neutral-950'],
  'bg-surface': ['neutral-0', 'neutral-800'],
  'bg-soft': ['blue-50', 'blue-900'],
  'bg-selected': ['blue-50', 'blue-800'],
  'bg-scrim': ['neutral-scrim', 'neutral-scrim'],
  'text-primary': ['neutral-900', 'neutral-50'],
  'text-secondary': ['neutral-500', 'neutral-400'],
  'text-on-brand': ['neutral-0', 'blue-950'],
  'text-on-soft': ['blue-700', 'blue-100'],
  'border-default': ['neutral-100', 'neutral-700'],
  'brand-primary': ['blue-500', 'blue-300'],
  'status-success': ['green-700', 'green-300'],
  'status-danger': ['red-700', 'red-300'],
  'toast-bg': ['neutral-900', 'neutral-50'],
  'toast-text': ['neutral-25', 'neutral-950'],
  'toast-link': ['blue-200', 'blue-700']
} as const satisfies Record<string, readonly [Prim, Prim]>;

/**
 * Extras that exist in the prototype but not in the plugin's token list.
 * Kept separate and named so they are visible, not hidden in screens.
 */
export const extras = {
  'confetti-pink': ['#E57A9A', '#E57A9A'],
  'placeholder': ['#8A99A8', '#8A99A8'],
  'splash-bg': ['#2E74BA', '#1F4E7D']
} as const;

export const space = { 2: 2, 4: 4, 8: 8, 12: 12, 16: 16, 20: 20, 24: 24, 32: 32, 40: 40 } as const;
export const radius = { xs: 4, sm: 8, md: 10, lg: 14, xl: 16, phone: 54, pill: 999 } as const;

/** [name, size px, weight, line-height %, letter-spacing px] */
export const typeScale = {
  display: [44, 700, 110, -1], title: [26, 700, 120, -0.5], heading: [20, 700, 125, -0.2],
  subheading: [18, 700, 130, 0], 'body-lg': [17, 400, 140, 0], body: [16, 400, 145, 0],
  'body-strong': [16, 600, 145, 0], label: [15, 600, 130, 0], small: [14, 400, 145, 0],
  caption: [13, 400, 140, 0], overline: [12, 600, 130, 1.5], micro: [11, 600, 120, 0]
} as const;

/** Elevation shadows: colour rgb(15,31,51) as in the plugin (r .06 g .12 b .2). */
const sh = (y: number, blur: number, a: number, spread = 0) => `0 ${y}px ${blur}px ${spread}px rgba(15, 31, 51, ${a})`;
export const elevation = {
  1: `${sh(1, 3, 0.06)}, ${sh(4, 12, 0.05)}`,
  2: sh(10, 30, 0.12, -6),
  3: sh(-8, 32, 0.16)
} as const;

/** Icon paths, 24×24 viewBox, stroke 1.8 round (from the plugin's ICONS). */
export const iconPaths = {
  home: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z', calendar: 'M4 6h16v15H4zM4 10h16M9 3v4M15 3v4',
  add: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 8v8M8 12h8', money: 'M3 7h18v13H3zM6 7l2-3h8l2 3M16 13.5h2',
  more: 'M4 6h16M4 12h16M4 18h16', settings: 'M4 7h9M17 7h3M15 5v4M4 17h3M11 17h9M9 15v4',
  clock: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 7v5l3 2', task: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM8 12.5l3 3 5-6',
  reminder: 'M6 9a6 6 0 1 1 12 0c0 6 3 8 3 8H3s3-2 3-8M10 20a2 2 0 0 0 4 0',
  star: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z',
  expense: 'M12 5v14M6 13l6 6 6-6', income: 'M12 19V5M6 11l6-6 6 6',
  bill: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  goal: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z',
  mic: 'M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0zM5 11a7 7 0 0 0 14 0M12 18v3',
  close: 'M6 6l12 12M18 6 6 18', check: 'M5 12.5 10 17l9-10', plus: 'M12 5v14M5 12h14',
  'chevron-left': 'M15 6l-6 6 6 6', 'chevron-right': 'M9 6l6 6-6 6',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  sun: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  globe: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9s1.3-6.4 3.8-9z',
  bell: 'M6 9a6 6 0 1 1 12 0c0 6 3 8 3 8H3s3-2 3-8M10 20a2 2 0 0 0 4 0',
  undo: 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
  hand: 'M9 11V5a2 2 0 0 1 4 0v6M13 10a2 2 0 0 1 4 0v3a6 6 0 0 1-6 6h-1a5 5 0 0 1-4.5-2.8L4 13.5a1.6 1.6 0 0 1 2.7-1.6L9 14',
  more2: 'M5 12h.01M12 12h.01M19 12h.01', edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4'
} as const;
export type IconName = keyof typeof iconPaths;
/** Icons whose direction flips in RTL. */
export const directionalIcons: IconName[] = ['chevron-left', 'chevron-right', 'undo'];

/** Responsive breakpoints from the brief. */
export const breakpoints = { tablet: 768, desktop: 1200 } as const;

/** Motion — timings/easing copied from the prototype. */
export const motion = {
  easeOut: 'cubic-bezier(.2,.8,.2,1)', easeInOut: 'cubic-bezier(.4,0,.2,1)',
  screen: 280, sheet: 240, themeReveal: 560, countUp: 1100, strike: 420, toast: 4500,
  longPress: 480, swipeThreshold: 88, sheetDismiss: 110, confetti: 2000, splash: 2800
} as const;
