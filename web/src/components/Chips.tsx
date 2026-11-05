import type { ReactNode } from 'react';
/** Chip — Style: neutral | selected | info | success | danger */
export function Chip({ style = 'neutral', children }: { style?: 'neutral' | 'selected' | 'info' | 'success' | 'danger'; children: ReactNode }) {
  return <span className={`chip chip--${style}`}>{children}</span>;
}
