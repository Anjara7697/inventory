'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ComponentType, ReactNode, useEffect, useState } from 'react';
import { SessionUser, api, clearSession, getUser } from '@/lib/api';
import {
  IconCart, IconClose, IconDashboard, IconFactory, IconLogout, IconMaterial, IconMenu, IconProduct, IconReport, IconSettings, IconStock,
} from './icons';
import { buttonClass, cx } from './ui';

const nav: [string, string, ComponentType<{ size?: number }>][] = [
  ['/', 'Tableau de bord', IconDashboard], ['/products', 'Produits', IconProduct], ['/materials', 'Matières', IconMaterial],
  ['/stock', 'Stocks', IconStock], ['/production', 'Production', IconFactory], ['/purchases', 'Achats', IconCart],
  ['/reports', 'Rapports', IconReport], ['/settings', 'Paramètres', IconSettings],
];

const ROLE_LABEL: Record<SessionUser['role'], string> = { ADMIN: 'Administrateur', MANAGER: 'Responsable', OPERATOR: 'Opérateur', VIEWER: 'Lecture seule' };

/** Pages that only some roles may open (the API enforces the same rules; this just avoids showing dead forms). */
const RESTRICTED: [RegExp, SessionUser['role']][] = [
  [/^\/products\/new$/, 'MANAGER'], [/^\/products\/\d+\/edit$/, 'MANAGER'],
  [/^\/materials\/new$/, 'MANAGER'], [/^\/materials\/\d+$/, 'MANAGER'],
  [/^\/purchases\/new$/, 'MANAGER'], [/^\/purchases\/\d+\/edit$/, 'MANAGER'],
  [/^\/reports/, 'MANAGER'],
  [/^\/settings\/users/, 'ADMIN'],
];
const RANK = { VIEWER: 0, OPERATOR: 1, MANAGER: 2, ADMIN: 3 } as const;
export const canOpen = (path: string, u: SessionUser) =>
  RESTRICTED.every(([re, min]) => !re.test(path) || u.role === 'ADMIN' || (min === 'MANAGER' && RANK[u.role] >= RANK.MANAGER));

const Brand = () => (
  <Link href="/" className="flex items-center gap-2.5 px-2 text-base font-semibold">
    <span aria-hidden className="h-[22px] w-[22px] rounded-md bg-accent" />Inventory
  </Link>
);

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const u = getUser();
    if (!u) router.replace('/login');
    setUser(u);
    setReady(true);
  }, [router]);

  // Close the mobile menu and refresh the alert badge on every navigation.
  useEffect(() => {
    setMenuOpen(false);
    if (!getUser()) return;
    api<unknown[]>('/inventory/alerts').then((a) => setAlertCount(a.length)).catch(() => {});
  }, [path]);

  if (!ready || !user) return null;

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    clearSession(); router.replace('/login');
  };
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();

  const sidebar = (
    <>
      <Brand />
      <nav aria-label="Navigation principale" className="flex flex-col gap-0.5">
        {nav.filter(([href]) => canOpen(href, user)).map(([href, label, Icon]) => {
          const active = href === '/' ? path === '/' : path.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={active ? 'page' : undefined}
              className={cx('flex h-[38px] items-center gap-2.5 rounded-lg px-2.5 font-medium transition-colors',
                active ? 'bg-accent-soft text-accent-ink' : 'text-ink-muted hover:bg-sunken hover:text-ink')}>
              <Icon />{label}
              {href === '/stock' && alertCount > 0 && (
                <span className="ml-auto min-w-5 rounded-full bg-danger-soft px-1.5 text-center text-xs leading-5 text-danger tabular-nums" aria-label={`${alertCount} alertes`}>{alertCount}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex items-center gap-2.5 border-t border-line px-2 pt-3.5 text-[13px] leading-[18px]">
        <span aria-hidden className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-ink">{initials}</span>
        <Link href="/profile" className="min-w-0 flex-1 hover:text-accent">
          <span className="block truncate font-medium">{user.firstName} {user.lastName}</span>
          <span className="block text-xs text-ink-muted">{ROLE_LABEL[user.role]}</span>
        </Link>
        <button onClick={logout} aria-label="Se déconnecter" title="Se déconnecter" className={buttonClass('ghost', 'sm')}><IconLogout /></button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-7 border-r border-line bg-surface px-4 py-6 md:flex">{sidebar}</aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button aria-label="Fermer le menu" className="absolute inset-0 bg-black/30" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-7 bg-surface px-4 py-6 shadow-pop">
            <button onClick={() => setMenuOpen(false)} aria-label="Fermer le menu" className={cx(buttonClass('ghost', 'sm'), 'absolute top-5 right-3')}><IconClose /></button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface px-4 py-2.5 md:hidden">
          <Brand />
          <button onClick={() => setMenuOpen(true)} aria-label="Ouvrir le menu" className={cx(buttonClass('secondary'), 'h-11 w-11 px-0')}><IconMenu size={20} /></button>
        </div>

        <main className="mx-auto flex w-full max-w-[1240px] min-w-0 flex-col gap-6 px-4 pt-6 pb-16 md:px-12 md:pt-10">
          {canOpen(path, user) ? children : (
            <div className="rounded-[14px] border border-line bg-surface p-6 shadow-card">
              <h1 className="text-lg font-semibold">Accès refusé</h1>
              <p className="mt-1 text-sm text-ink-muted">Votre rôle ({ROLE_LABEL[user.role]}) ne permet pas d'ouvrir cette page.</p>
              <Link href="/" className="mt-3 inline-block text-sm font-medium text-accent hover:underline">Retour au tableau de bord</Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export const canWrite = (u: SessionUser | null, ...roles: SessionUser['role'][]) =>
  !!u && (u.role === 'ADMIN' || roles.includes(u.role));
