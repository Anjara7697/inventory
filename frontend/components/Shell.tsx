'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { SessionUser, api, clearSession, getUser } from '@/lib/api';

const nav = [
  ['/', 'Dashboard'], ['/products', 'Produits'], ['/materials', 'Matières'],
  ['/stock', 'Stocks'], ['/production', 'Production'],
] as const;

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
          <p>{user.firstName} {user.lastName} · {user.role}</p>
          <button className="mt-1 underline" onClick={async () => {
            await api('/auth/logout', { method: 'POST' }).catch(() => {});
            clearSession(); router.replace('/login');
          }}>Se déconnecter</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 space-y-4">{children}</main>
    </div>
  );
}

export const canWrite = (u: SessionUser | null, ...roles: SessionUser['role'][]) =>
  !!u && (u.role === 'ADMIN' || roles.includes(u.role));
