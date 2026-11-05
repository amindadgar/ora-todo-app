import { describe, it, expect } from 'vitest';
import { decodeGoogleCredential, initials } from '../src/lib/auth';

const b64u = (o: object) => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const jwt = (payload: object) => `${b64u({ alg: 'RS256' })}.${b64u(payload)}.sig`;
const NOW = 1_800_000_000, CID = 'abc.apps.googleusercontent.com';
const good = { iss: 'https://accounts.google.com', aud: CID, sub: '1234', exp: NOW + 3600, email: 'amin@example.com', name: 'Amin Dadgar', given_name: 'Amin', picture: 'https://x/y.png' };

describe('decodeGoogleCredential', () => {
  it('reads a valid token', () => { expect(decodeGoogleCredential(jwt(good), CID, NOW)).toEqual({ id: '1234', name: 'Amin Dadgar', givenName: 'Amin', email: 'amin@example.com', picture: 'https://x/y.png' }); });
  it('accepts the bare issuer form', () => { expect(decodeGoogleCredential(jwt({ ...good, iss: 'accounts.google.com' }), CID, NOW)?.id).toBe('1234'); });
  it('rejects wrong audience, issuer, expired, missing sub, garbage', () => {
    expect(decodeGoogleCredential(jwt({ ...good, aud: 'other' }), CID, NOW)).toBeNull();
    expect(decodeGoogleCredential(jwt({ ...good, iss: 'https://evil.com' }), CID, NOW)).toBeNull();
    expect(decodeGoogleCredential(jwt({ ...good, exp: NOW - 1 }), CID, NOW)).toBeNull();
    expect(decodeGoogleCredential(jwt({ ...good, sub: '' }), CID, NOW)).toBeNull();
    expect(decodeGoogleCredential('not.a.jwt', CID, NOW)).toBeNull(); expect(decodeGoogleCredential('x', CID, NOW)).toBeNull();
  });
  it('handles Persian names (UTF-8) and falls back when name is missing', () => {
    expect(decodeGoogleCredential(jwt({ ...good, name: 'امین دادگر', given_name: 'امین' }), CID, NOW)?.givenName).toBe('امین');
    const u = decodeGoogleCredential(jwt({ ...good, name: undefined, given_name: undefined }), CID, NOW); expect(u?.name).toBe('amin'); expect(u?.givenName).toBe('amin');
  });
  it('initials', () => { expect(initials('Amin Dadgar')).toBe('AD'); expect(initials('امین')).toBe('ا'); expect(initials('')).toBe('?'); });
});
