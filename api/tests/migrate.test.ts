import { describe, it, expect } from 'vitest';
import { createPool, migrate } from '../src/db.js';
import { TEST_DB } from './helpers.js';

describe('migrate', () => {
  it('is idempotent and safe under concurrent starts', async () => {
    const a = createPool(TEST_DB), b = createPool(TEST_DB);
    const [r1, r2] = await Promise.all([migrate(a), migrate(b)]); expect([...r1, ...r2].filter((f) => f === '001_init.sql').length).toBeLessThanOrEqual(1);
    expect(await migrate(a)).toEqual([]); await a.end(); await b.end();
  });
});
