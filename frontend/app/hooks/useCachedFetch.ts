"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCached, setCached, getFetchedAt, DEFAULT_TTL_MS } from "@/lib/dataCache";

/**
 * useCachedFetch — drop-in replacement for useEffect + fetch.
 *
 * Behaviour:
 *  • First visit  → fetches from network, stores in module-level cache.
 *  • Tab switch   → reads from cache instantly — zero network calls, zero loading flash.
 *  • TTL expired  → re-fetches automatically on next mount.
 *  • refresh()    → bypasses cache and force-fetches immediately.
 *  • fetchedAt    → timestamp of last successful fetch for "Updated X ago" display.
 */
export function useCachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
) {
  // Initialise *synchronously* from the module cache — no loading flash on tab return.
  const [data, setData] = useState<T | null>(() => getCached<T>(key, ttlMs));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [fetchedAt, setFetchedAt] = useState<number | null>(() => getFetchedAt(key));

  // Keep a stable ref so doFetch closure never captures a stale fetcher.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const doFetch = useCallback(
    async (force = false) => {
      if (!force) {
        // Return immediately if the cache is still warm.
        const cached = getCached<T>(key, ttlMs);
        if (cached !== null) return;
      }
      setLoading(true);
      setError("");
      try {
        const result = await fetcherRef.current();
        setCached(key, result);
        setData(result);
        setFetchedAt(Date.now());
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    },
    [key, ttlMs],
  );

  // On mount: fetch only when the cache is cold (first visit or TTL expired).
  useEffect(() => {
    doFetch(false);
  }, [doFetch]);

  const refresh = useCallback(() => doFetch(true), [doFetch]);

  return { data, loading, error, refresh, fetchedAt };
}
