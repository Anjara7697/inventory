'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, apiList } from './api';

/** Loads `path` and exposes reload(). */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!path) return;
    try { setError(undefined); setData(await api<T>(path)); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [path]);
  useEffect(() => { load(); }, [load]);
  return { data, error, loading, reload: load };
}

/** Debounces a fast-changing value (search boxes). */
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

/**
 * Paginated list. `filters` empty values are dropped; changing filters returns to page 0.
 * Returns the current page of items, the total and pager controls.
 */
export function usePaged<T = any>(path: string, filters: Record<string, string | undefined>, pageSize = 20) {
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const key = JSON.stringify(filters);

  useEffect(() => { setPage(0); }, [key]);

  const load = useCallback(async () => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(JSON.parse(key) as Record<string, string | undefined>)) if (v) q.set(k, v);
    q.set('limit', String(pageSize)); q.set('offset', String(page * pageSize));
    try {
      setError(undefined);
      const r = await apiList<T>(`${path}?${q}`);
      setItems(r.items); setTotal(r.total);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [path, key, page, pageSize]);

  useEffect(() => { load(); }, [load]);
  return { items, total, error, loading, page, pageSize, setPage, reload: load };
}
