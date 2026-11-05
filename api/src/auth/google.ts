import { OAuth2Client } from 'google-auth-library';
import type { Config } from '../config.js';

export interface GoogleProfile { sub: string; email: string; name: string; picture?: string }
export class AuthError extends Error { constructor(public code: 'not_configured' | 'invalid_token', message: string) { super(message); } }

/** Verifies a Google Identity Services ID token (signature, issuer, audience, expiry) — or a mock one in dev/test. */
export interface TokenVerifier { verify(credential: string): Promise<GoogleProfile> }

export function createVerifier(cfg: Pick<Config, 'GOOGLE_CLIENT_ID' | 'AUTH_MOCK' | 'NODE_ENV'>): TokenVerifier {
  const client = cfg.GOOGLE_CLIENT_ID ? new OAuth2Client(cfg.GOOGLE_CLIENT_ID) : null;
  return {
    async verify(credential) {
      if (cfg.AUTH_MOCK && cfg.NODE_ENV !== 'production' && credential.startsWith('mock:')) {
        const [, id, ...rest] = credential.split(':');
        if (!id || !/^[\w.-]{1,64}$/.test(id)) throw new AuthError('invalid_token', 'bad mock credential');
        return { sub: `mock-${id}`, email: `${id}@example.com`, name: rest.join(':') || id };
      }
      if (!client || !cfg.GOOGLE_CLIENT_ID) throw new AuthError('not_configured', 'Google sign-in is not configured');
      try {
        const ticket = await client.verifyIdToken({ idToken: credential, audience: cfg.GOOGLE_CLIENT_ID });
        const p = ticket.getPayload();
        if (!p?.sub || !p.email) throw new Error('missing claims');
        if (p.email_verified === false) throw new Error('email not verified');
        return { sub: p.sub, email: p.email, name: p.name || p.email.split('@')[0] || 'You', picture: p.picture };
      } catch (e) { throw new AuthError('invalid_token', (e as Error).message); }
    }
  };
}
