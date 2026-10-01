'use client';
import Link from 'next/link';
import { canWrite } from '@/components/Shell';
import { Card, ErrorText, Table } from '@/components/ui';
import { getUser } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { StatusBadge, ref } from './status';

export default function Purchases() {
  const { data, error } = useApi<any[]>('/purchase-orders');
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Achats</h1>
        {canWrite(getUser(), 'MANAGER') && <Link href="/purchases/new" className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">Nouvelle commande</Link>}
      </div>
      <ErrorText>{error}</ErrorText>
      <Card>
        <Table head={['N°', 'Date', 'Fournisseur', 'Lignes', 'Statut']}>
          {data?.map((o) => (
            <tr key={o.id}>
              <td><Link className="font-mono text-xs underline" href={`/purchases/${o.id}`}>{ref(o.id)}</Link></td>
              <td>{new Date(o.createdAt).toLocaleDateString('fr-FR')}</td><td>{o.supplier.name}</td>
              <td>{o.lines.length}</td><td><StatusBadge status={o.status} /></td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
