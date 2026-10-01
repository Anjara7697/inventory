'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { getUser } from '@/lib/api';

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const path = usePathname();
  const isAdmin = getUser()?.role === 'ADMIN';
  const tabs = [['/settings/units', 'Unités'], ['/settings/characteristics', 'Caractéristiques'], ['/settings/suppliers', 'Fournisseurs'], ...(isAdmin ? [['/settings/users', 'Utilisateurs']] : [])];
  return (
    <>
      <h1 className="text-xl font-semibold">Paramètres</h1>
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map(([href, label]) => (
          <Link key={href} href={href} className={`-mb-px border-b-2 px-3 py-1.5 text-sm ${path === href ? 'border-zinc-900 font-medium dark:border-zinc-100' : 'border-transparent text-zinc-500'}`}>{label}</Link>
        ))}
      </div>
      {children}
    </>
  );
}
