import { describe, it, expect } from 'vitest';
import { initials } from '../src/lib/auth';

describe('initials', () => { it('works for Latin, Persian and empty names', () => { expect(initials('Amin Dadgar')).toBe('AD'); expect(initials('امین')).toBe('ا'); expect(initials('')).toBe('?'); expect(initials('a b c')).toBe('AB'); }); });
