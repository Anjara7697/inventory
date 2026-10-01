const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: any) {
    super(message);
  }
}

const store = {
  get: (k: string) => (typeof window === 'undefined' ? null : localStorage.getItem(k)),
  set: (k: string, v: string) => localStorage.setItem(k, v),
  del: (k: string) => localStorage.removeItem(k),
};

export interface SessionUser { id: number; email: string; firstName: string; lastName: string; role: 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER' }
export const getUser = (): SessionUser | null => {
  try { return JSON.parse(store.get('user') ?? 'null'); } catch { return null; }
};
export const saveSession = (r: { accessToken: string; refreshToken: string; user: SessionUser }) => {
  store.set('accessToken', r.accessToken); store.set('refreshToken', r.refreshToken); store.set('user', JSON.stringify(r.user));
};
export const clearSession = () => ['accessToken', 'refreshToken', 'user'].forEach(store.del);

let refreshing: Promise<boolean> | null = null;
function refresh(): Promise<boolean> {
  refreshing ??= (async () => {
    const token = store.get('refreshToken');
    if (!token) return false;
    const res = await fetch(`${API}/auth/refresh`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken: token }) });
    if (!res.ok) return false;
    saveSession(await res.json());
    return true;
  })().finally(() => { refreshing = null; });
  return refreshing;
}

type Init = { method?: string; body?: unknown; auth?: boolean };

async function request(path: string, init: Init, retry = true): Promise<{ data: any; res: Response }> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  const token = store.get('accessToken');
  if (init.auth !== false && token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { method: init.method ?? 'GET', headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
  if (res.status === 401 && init.auth !== false && retry && (await refresh())) return request(path, init, false);
  if (res.status === 401 && init.auth !== false) {
    clearSession();
    if (typeof window !== 'undefined') window.location.href = '/login';
  }
  if (res.status === 204) return { data: undefined, res };
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const m = data?.message;
    throw new ApiError(res.status, Array.isArray(m) ? m.join(', ') : (typeof m === 'string' ? m : res.statusText), data);
  }
  return { data, res };
}

export async function api<T = any>(path: string, init: Init = {}): Promise<T> {
  return (await request(path, init)).data as T;
}

/** GET a paginated list: items + total from the X-Total-Count header. */
export async function apiList<T = any>(path: string): Promise<{ items: T[]; total: number }> {
  const { data, res } = await request(path, {});
  return { items: data as T[], total: Number(res.headers.get('X-Total-Count') ?? (data as T[]).length) };
}

export const num = (v: string | number | null | undefined, digits = 3) =>
  v === null || v === undefined ? '' : Number(v).toLocaleString('fr-FR', { maximumFractionDigits: digits });

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? 'EUR';
/** Formats an amount in the configured currency (NEXT_PUBLIC_CURRENCY, ISO code, default EUR). */
export const money = (v: string | number | null | undefined) =>
  v === null || v === undefined ? '' : Number(v).toLocaleString('fr-FR', { style: 'currency', currency: CURRENCY, maximumFractionDigits: 2 });
