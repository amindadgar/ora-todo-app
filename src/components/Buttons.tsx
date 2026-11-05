import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from '../tokens/tokens';

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement>;
/** Button — Variant: primary | secondary | ghost | danger · Size: lg | md | sm · State: default/pressed(:active)/disabled */
export function Button({ variant = 'primary', size = 'md', icon, block, children, className = '', ...p }:
  BtnProps & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'lg' | 'md' | 'sm'; icon?: IconName; block?: boolean; children?: ReactNode }) {
  return (
    <button type="button" className={`btn btn--${variant} btn--${size}${block ? ' btn--block' : ''} ${className}`} {...p}>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}{children}
    </button>
  );
}
/** Icon button — 44×44 touch target. Style: filled | outlined | plain */
export function IconButton({ icon, label, kind = 'outlined', size = 20, className = '', ...p }:
  BtnProps & { icon: IconName; label: string; kind?: 'filled' | 'outlined' | 'plain' | 'muted'; size?: number }) {
  return <button type="button" aria-label={label} title={label} className={`ibtn ibtn--${kind} ${className}`} {...p}><Icon name={icon} size={size} /></button>;
}
/** Text button — "+ Add a task" style inline action. */
export function TextButton({ icon, children, className = '', small, ...p }: BtnProps & { icon?: IconName; small?: boolean }) {
  return <button type="button" className={`btn--text${small ? ' t-small' : ''} ${className}`} {...p}>{icon && <Icon name={icon} size={18} stroke={2} />}{children}</button>;
}
