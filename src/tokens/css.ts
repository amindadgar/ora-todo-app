import { primitives, semantic, extras, space, radius, typeScale, elevation, motion } from './tokens';

/** Build the global token stylesheet (CSS custom properties) from tokens.ts. */
export function buildTokenCss(): string {
  const prim = Object.entries(primitives).map(([k, v]) => `--p-${k}:${v};`).join('');
  const theme = (i: 0 | 1) =>
    Object.entries(semantic).map(([k, [l, d]]) => `--c-${k}:var(--p-${i === 0 ? l : d});`).join('') +
    Object.entries(extras).map(([k, v]) => `--c-${k}:${v[i]};`).join('');
  const sp = Object.entries(space).map(([k, v]) => `--space-${k}:${v}px;`).join('');
  const rd = Object.entries(radius).map(([k, v]) => `--radius-${k}:${v}px;`).join('');
  const ts = Object.entries(typeScale).map(([k, [s, w, lh, ls]]) =>
    `--t-${k}-size:${s}px;--t-${k}-weight:${w};--t-${k}-lh:${lh / 100};--t-${k}-ls:${ls}px;`).join('');
  const el = Object.entries(elevation).map(([k, v]) => `--elev-${k}:${v};`).join('');
  const mo = `--ease-out:${motion.easeOut};--ease-in-out:${motion.easeInOut};`;
  return `:root{${prim}${sp}${rd}${ts}${el}${mo}${theme(0)}color-scheme:light}` +
    `:root[data-theme="dark"]{${theme(1)}color-scheme:dark}`;
}

/** Type-style utility classes (.t-body, .t-label …) so components never hard-code sizes. */
export function buildTypeClasses(): string {
  return Object.keys(typeScale).map((k) =>
    `.t-${k}{font-size:var(--t-${k}-size);font-weight:var(--t-${k}-weight);line-height:var(--t-${k}-lh);letter-spacing:var(--t-${k}-ls)}`).join('');
}
