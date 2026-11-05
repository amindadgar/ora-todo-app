/** Same-origin API client. In production the Caddy gateway forwards /api/* to the api service; in dev Vite proxies it. */
export class ApiError extends Error {
  constructor(public status: number, public code: string) { super(`${status} ${code}`); }
  /** status 0 = the network (or the server) is unreachable */
  get offline() { return this.status === 0; }
}
export async function api<T = unknown>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch('/api' + path, { method, credentials: 'same-origin', cache: 'no-store', headers: body !== undefined ? { 'content-type': 'application/json' } : undefined, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch { throw new ApiError(0, 'network'); }
  if (res.status === 204) return undefined as T;
  let json: unknown = null; try { json = await res.json(); } catch { /* non-JSON error page from a proxy */ }
  if (!res.ok) throw new ApiError(res.status, (json as { error?: string } | null)?.error ?? 'error');
  return json as T;
}
