import type { Dict } from '../i18n/dict';

export const CREDIT_LINKS = {
  yeganehBehance: 'https://www.behance.net/yeganehakbarish',
  yeganehDribbble: 'https://dribbble.com/yeganeh-akbari-sh',
  amin: 'https://amindadgar.com/'
} as const;

const A = ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href} target="_blank" rel="noopener noreferrer" className="credit-link">{children}</a>;

/** "Design: Yeganeh Akbari (Behance · Dribbble) · Implementation: Amin Dadgar" with the names as links. */
export function Credits({ t, className = '' }: { t: Dict; className?: string }) {
  return (
    <p className={`t-micro muted credits ${className}`} style={{ fontWeight: 400, lineHeight: 1.7 }}>
      <span>{t.creditDesign}: {t.creditYeganeh} (<A href={CREDIT_LINKS.yeganehBehance}>Behance</A> · <A href={CREDIT_LINKS.yeganehDribbble}>Dribbble</A>)</span>
      {' · '}
      <span>{t.creditImpl}: <A href={CREDIT_LINKS.amin}>{t.creditAmin}</A></span>
    </p>
  );
}
