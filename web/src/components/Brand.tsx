/** Ora logo: ring + orbiting dot, with the "Ora" wordmark (always LTR, Figtree). */
export function Logo({ size = 34, word = true }: { size?: number; word?: boolean }) {
  return (
    <div className="logo">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2.6" />
        <circle cx="18" cy="6" r="3" fill="currentColor" stroke="var(--c-bg-canvas)" strokeWidth="2" />
      </svg>
      {word && <span className="logo__word">Ora</span>}
    </div>
  );
}
