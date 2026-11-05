export interface User { id: string; name: string; givenName: string; email: string; picture?: string | null }

/** Initials for the avatar fallback. */
export const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
