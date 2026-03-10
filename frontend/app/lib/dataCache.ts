/**
 * Module-level singleton cache.
 *
 * Lives outside React's component tree — survives every unmount/remount
 * caused by tab switching in Next.js. Data stays alive for the entire
 * browser session and is served instantly on the next render.
 *
 * TTL guarantees new backend data is always picked up within the window,
 * and the "↺ Refresh" button lets users force-fetch at any time.
 */

type Entry = { data: unknown; fetchedAt: number };

const _store = new Map<string, Entry>();

/** Default TTL: 5 minutes. Covers tab-switching without going stale. */
export const DEFAULT_TTL_MS = 5 * 60 * 1000;

/** Return cached data if present and within TTL, otherwise null. */
export function getCached<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | null {
  const entry = _store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > ttlMs) return null;
  return entry.data as T;
}

/** Store data with the current timestamp. */
export function setCached(key: string, data: unknown): void {
  _store.set(key, { data, fetchedAt: Date.now() });
}

/** Timestamp (ms since epoch) of when the entry was last fetched, or null. */
export function getFetchedAt(key: string): number | null {
  return _store.get(key)?.fetchedAt ?? null;
}

/** Remove one key, forcing the next read to re-fetch from the network. */
export function invalidate(key: string): void {
  _store.delete(key);
}

/** Wipe the entire cache (e.g. after a portfolio update). */
export function invalidateAll(): void {
  _store.clear();
}
