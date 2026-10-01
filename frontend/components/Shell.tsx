'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { SessionUser, api, clearSession, getUser } from '@/lib/api';

const nav = [
  ['/', 'Dashboard'], ['/products', 'Produits'], ['/materials', 'Matières'],
  ['/stock', 'Stocks'], ['/production', 'Production'], ['/purchases', 'Achats'], ['/settings', 'Paramètres'],
] as const;

/** Pages that only some roles may open (the API enforces the same rules; this just avoids showing dead forms). */
const RESTRICTED: [RegExp, SessionUser['role']][] = [
  [/^\/products\/new$/, 'MANAGER'], [/^\/products\/\d+\/edit$/, 'MANAGER'],
  [/^\/materials\/new$/, 'MANAGER'], [/^\/materials\/\d+$/, 'MANAGER'],
  [/^\/purchases\/new$/, 'MANAGER'], [/^\/purchases\/\d+\/edit$/, 'MANAGER'],
  [/^\/settings\/users/, 'ADMIN'],
];
const RANK = { VIEWER: 0, OPERATOR: 1, MANAGER: 2, ADMIN: 3 } as const;
export const canOpen = (path: string, u: SessionUser) =>
  RESTRICTED.every(([re, min]) => !re.test(path) || u.role === 'ADMIN' || (min === 'MANAGER' && RANK[u.role] >= RANK.MANAGER));

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) router.replace('/login');
    setUser(u);
    setReady(true);
  }, [router]);

  if (!ready || !user) return null;
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 p-4 md:flex-row">
      <aside className="md:w-48 md:shrink-0">
        <p className="mb-3 text-lg font-semibold">Inventory</p>
        <nav className="flex gap-1 md:flex-col">
          {nav.map(([href, label]) => {
            const active = href === '/' ? path === '/' : path.startsWith(href);
            return (
              <Link key={href} href={href}
                className={`rounded-md px-3 py-1.5 text-sm ${active ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 text-xs text-zinc-500">
          <p><Link href="/profile" className="underline">{user.firstName} {user.lastName}</Link> · {user.role}</p>
          <button className="mt-1 underline" onClick={async () => {
            await api('/auth/logout', { method: 'POST' }).catch(() => {});
            clearSession(); router.replace('/login');
          }}>Se déconnecter</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 space-y-4">
        {canOpen(path, user) ? children : (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h1 className="text-lg font-semibold">Accès refusé</h1>
            <p className="mt-1 text-sm text-zinc-500">Votre rôle ({user.role}) ne permet pas d'ouvrir cette page.</p>
            <Link href="/" className="mt-3 inline-block text-sm underline">Retour au dashboard</Link>
          </div>
        )}
      </main>
    </div>
  );
}

export const canWrite = (u: SessionUser | null, ...roles: SessionUser['role'][]) =>
  !!u && (u.role === 'ADMIN' || roles.includes(u.role));
