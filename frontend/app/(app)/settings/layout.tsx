'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { PageHeader, cx } from '@/components/ui';
import { getUser } from '@/lib/api';

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const path = usePathname();
  const isAdmin = getUser()?.role === 'ADMIN';
  const tabs = [['/settings/units', 'Unités'], ['/settings/characteristics', 'Caractéristiques'], ['/settings/suppliers', 'Fournisseurs'], ...(isAdmin ? [['/settings/users', 'Utilisateurs']] : [])];
  return (
    <>
      <PageHeader title="Paramètres" overline="Référentiel partagé par toute l'application" />
      <nav aria-label="Sections des paramètres" className="-mt-2 flex gap-7 overflow-x-auto border-b border-line">
        {tabs.map(([href, label]) => (
          <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}
            className={cx('-mb-px border-b-2 py-2.5 font-medium whitespace-nowrap transition-colors', path === href ? 'border-accent text-ink' : 'border-transparent text-ink-muted hover:text-ink')}>
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </>
  );
}
