export interface User { id: string; name: string; givenName: string; email: string; picture?: string }

const b64urlToUtf8 = (s: string) => {
  const b = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=');
  const bin = atob(b); const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

/**
 * Read the profile out of a Google Identity Services ID token (JWT) and sanity-check it.
 * IMPORTANT: this runs in the browser and does NOT verify the signature. That is fine for a local-first app
 * (the token only labels a local data namespace); a server that trusts the user must verify it server-side.
 */
export function decodeGoogleCredential(jwt: string, clientId: string, nowSec = Math.floor(Date.now() / 1000)): User | null {
  try {
    const parts = jwt.split('.'); if (parts.length !== 3) return null;
    const p = JSON.parse(b64urlToUtf8(parts[1])) as Record<string, unknown>;
    if (p.iss !== 'accounts.google.com' && p.iss !== 'https://accounts.google.com') return null;
    if (p.aud !== clientId) return null;
    if (typeof p.exp !== 'number' || p.exp < nowSec) return null;
    if (typeof p.sub !== 'string' || !p.sub) return null;
    const email = typeof p.email === 'string' ? p.email : '';
    const name = typeof p.name === 'string' && p.name ? p.name : email.split('@')[0] || 'You';
    const givenName = typeof p.given_name === 'string' && p.given_name ? p.given_name : name.split(' ')[0];
    return { id: p.sub, name, givenName, email, picture: typeof p.picture === 'string' ? p.picture : undefined };
  } catch { return null; }
}
/** Initials for the avatar fallback. */
export const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
