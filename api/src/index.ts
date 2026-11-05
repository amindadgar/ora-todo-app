import { loadConfig } from './config.js';
import { createPool, migrate } from './db.js';
import { buildApp } from './app.js';

const cfg = loadConfig();
const db = createPool(cfg.DATABASE_URL, cfg.DB_POOL_MAX);
const app = await buildApp({ cfg, db });

const ran = await migrate(db);
if (ran.length) app.log.info({ migrations: ran }, 'migrations applied');
if (!cfg.GOOGLE_CLIENT_ID && !cfg.AUTH_MOCK) app.log.warn('GOOGLE_CLIENT_ID is not set: Google sign-in will answer 503');

// housekeeping: expired sessions and 90-day-old delete tombstones
const sweep = async () => {
  try {
    await db.query('delete from sessions where expires_at < now()');
    await db.query(`delete from records where deleted and updated_at < now() - interval '90 days'`);
  } catch (e) { app.log.warn({ err: e }, 'sweep failed'); }
};
const timer = setInterval(sweep, 6 * 3600_000); timer.unref(); void sweep();

const stop = async (sig: string) => { app.log.info({ sig }, 'shutting down'); clearInterval(timer); await app.close(); await db.end(); process.exit(0); };
process.on('SIGTERM', () => void stop('SIGTERM')); process.on('SIGINT', () => void stop('SIGINT'));
await app.listen({ port: cfg.PORT, host: cfg.HOST });
