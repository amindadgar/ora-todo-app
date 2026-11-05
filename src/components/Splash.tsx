import { useEffect } from 'react';
import { motion } from '../tokens/tokens';

/** Welcome splash: ring draws, dot orbits in, wordmark + tagline rise (2.8s, tap to skip). */
export function Splash({ tagline, onDone, label }: { tagline: string; onDone: () => void; label: string }) {
  useEffect(() => { const t = setTimeout(onDone, motion.splash); return () => clearTimeout(t); }, [onDone]);
  return (
    <button type="button" onClick={onDone} aria-label={label} className="splash">
      <svg width="112" height="112" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" stroke="var(--p-neutral-0)" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="53.41" style={{ transformOrigin: '12px 12px', transform: 'rotate(-45deg)', animation: 'rz-draw 1s cubic-bezier(.6,0,.2,1) both' }} />
        <g style={{ transformOrigin: '12px 12px', animation: 'rz-orbit 1s cubic-bezier(.6,0,.2,1) both' }}>
          <circle cx="18" cy="6" r="3" fill="var(--p-neutral-0)" stroke="var(--c-splash-bg)" strokeWidth="2" style={{ transformOrigin: '18px 6px', animation: 'rz-pop .45s 1s ease-out both' }} />
        </g>
      </svg>
      <span className="t-display" style={{ fontFamily: 'var(--font-en)', letterSpacing: '.5px', lineHeight: 1, animation: 'rz-rise .5s .95s ease-out both' }}>Ora</span>
      <span className="t-label" style={{ fontWeight: 400, opacity: .9, animation: 'rz-rise .5s 1.2s ease-out both' }}>{tagline}</span>
    </button>
  );
}
