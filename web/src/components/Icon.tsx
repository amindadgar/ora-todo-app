import { iconPaths, directionalIcons, type IconName } from '../tokens/tokens';

/** Stroke icon from the design-system icon set. Directional icons mirror in RTL via CSS. */
export function Icon({ name, size = 24, stroke = 1.8, className = '' }: { name: IconName; size?: number; stroke?: number; className?: string }) {
  const dir = directionalIcons.includes(name);
  return (
    <svg className={`o-icon${dir ? ' o-icon--dir' : ''} ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={iconPaths[name]} /></svg>
  );
}
