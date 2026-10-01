'use client';
import Link from 'next/link';
import { useState } from 'react';
import { canWrite } from '@/components/Shell';
import { Badge, Card, ErrorText, Field, Pager, Select, Table } from '@/components/ui';
import { api, getUser, num } from '@/lib/api';
import { usePaged } from '@/lib/hooks';

const STATUS: Record<string, [string, 'green' | 'red' | 'gray' | 'amber']> = {
  COMPLETED: ['Terminée', 'green'], CANCELLED: ['Annulée', 'red'], PENDING: ['En attente', 'gray'], IN_PROGRESS: ['En cours', 'amber'],
};

export default function ProductionHistory() {
  const [status, setStatus] = useState('');
  const list = usePaged('/production', { status: status || undefined });
  const { error, reload } = list;
  const [actionError, setActionError] = useState<string>();
  const manager = canWrite(getUser(), 'MANAGER');

  async function cancel(p: any) {
    if (!confirm(`Annuler la production de ${num(p.quantity)} × ${p.product.name} ? Les matières reviennent en stock et les produits fabriqués sont retirés.`)) return;
    setActionError(undefined);
    try { await api(`/production/${p.id}/cancel`, { method: 'POST' }); reload(); }
    catch (e) { setActionError((e as Error).message); }
  }

  return (
    <>
      <h1 className="text-xl font-semibold">Production</h1>
      <p className="text-sm text-zinc-500">Pour lancer une production, ouvrez la page d'un produit.</p>
      <ErrorText>{error ?? actionError}</ErrorText>
      <Card title="Historique">
        <div className="mb-3"><Field label="Statut"><Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44"><option value="">Tous</option><option value="COMPLETED">Terminée</option><option value="CANCELLED">Annulée</option></Select></Field></div>
        <Table head={['#', 'Date', 'Produit', 'Quantité', 'Statut', 'Par', '']}>
          {list.items.map((p: any) => (
            <tr key={p.id}>
              <td className="font-mono text-xs">PROD-{String(p.id).padStart(5, '0')}</td>
              <td>{new Date(p.createdAt).toLocaleString('fr-FR')}</td>
              <td><Link className="underline" href={`/products/${p.productId}`}>{p.product.name}</Link></td>
              <td>{num(p.quantity)}</td>
              <td><Badge tone={STATUS[p.status][1]}>{STATUS[p.status][0]}</Badge></td>
              <td>{p.user.firstName}</td>
              <td className="text-right">{manager && p.status === 'COMPLETED' && <button className="text-xs text-red-600 underline" onClick={() => cancel(p)}>Annuler</button>}</td>
            </tr>
          ))}
        </Table>
        <Pager page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} />
      </Card>
    </>
  );
}
