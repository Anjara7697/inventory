'use client';
import Link from 'next/link';
import { canWrite } from '@/components/Shell';
import { useState } from 'react';
import { Card, ErrorText, Field, Pager, Select, Table } from '@/components/ui';
import { getUser } from '@/lib/api';
import { usePaged } from '@/lib/hooks';
import { StatusBadge, ref } from './status';

export default function Purchases() {
  const [status, setStatus] = useState('');
  const list = usePaged('/purchase-orders', { status: status || undefined });
  const { error } = list;
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Achats</h1>
        {canWrite(getUser(), 'MANAGER') && <Link href="/purchases/new" className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">Nouvelle commande</Link>}
      </div>
      <ErrorText>{error}</ErrorText>
      <Card>
        <div className="mb-3"><Field label="Statut"><Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44"><option value="">Tous</option><option value="DRAFT">Brouillon</option><option value="ORDERED">Commandée</option><option value="RECEIVED">Reçue</option><option value="CANCELLED">Annulée</option></Select></Field></div>
        <Table head={['N°', 'Date', 'Fournisseur', 'Lignes', 'Statut']}>
          {list.items.map((o: any) => (
            <tr key={o.id}>
              <td><Link className="font-mono text-xs underline" href={`/purchases/${o.id}`}>{ref(o.id)}</Link></td>
              <td>{new Date(o.createdAt).toLocaleDateString('fr-FR')}</td><td>{o.supplier.name}</td>
              <td>{o.lines.length}</td><td><StatusBadge status={o.status} /></td>
            </tr>
          ))}
        </Table>
        <Pager page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} />
      </Card>
    </>
  );
}
