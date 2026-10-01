'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { canWrite } from '@/components/Shell';
import { Button, Card, ErrorText, Table } from '@/components/ui';
import { api, getUser, money, num } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { StatusBadge, ref } from '../status';

export default function PurchasePage() {
  const { id } = useParams<{ id: string }>();
  const { data: o, error: loadError, reload } = useApi<any>(`/purchase-orders/${id}`);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const user = getUser();

  async function act(action: 'order' | 'receive' | 'cancel', confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(true); setError(undefined);
    try { await api(`/purchase-orders/${id}/${action}`, { method: 'POST' }); await reload(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  if (loadError) return <ErrorText>{loadError}</ErrorText>;
  if (!o) return null;
  const manager = canWrite(user, 'MANAGER');
  return (
    <>
      <p className="text-sm"><Link href="/purchases" className="underline">← Achats</Link></p>
      <div className="flex items-center gap-3">
        <h1 className="font-mono text-xl font-semibold">{ref(o.id)}</h1><StatusBadge status={o.status} />
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {o.supplier.name} · créée le {new Date(o.createdAt).toLocaleDateString('fr-FR')} par {o.user.firstName}
        {o.receivedAt && ` · reçue le ${new Date(o.receivedAt).toLocaleDateString('fr-FR')}`}
      </p>
      {o.notes && <p className="text-sm">{o.notes}</p>}
      <Card title="Lignes">
        <Table head={['Matière', 'SKU', 'Quantité', 'Prix unitaire', 'Montant']}>
          {o.lines.map((l: any) => (
            <tr key={l.id}><td>{l.material.name}</td><td className="font-mono text-xs">{l.material.sku}</td><td>{num(l.quantity)} {l.unit.symbol}</td><td>{l.unitPrice == null ? '—' : `${money(l.unitPrice)} / ${l.unit.symbol}`}</td><td>{l.unitPrice == null ? '—' : money(Number(l.unitPrice) * Number(l.quantity))}</td></tr>
          ))}
        </Table>
        {o.lines.some((l: any) => l.unitPrice != null) && (
          <p className="mt-2 text-right text-sm font-medium">Total : {money(o.lines.reduce((t: number, l: any) => t + (l.unitPrice == null ? 0 : Number(l.unitPrice) * Number(l.quantity)), 0))}</p>
        )}
      </Card>
      <ErrorText>{error}</ErrorText>
      <div className="flex flex-wrap gap-2">
        {o.status === 'DRAFT' && manager && <>
          <Link href={`/purchases/${id}/edit`} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700">Modifier</Link>
          <Button disabled={busy} onClick={() => act('order')}>Passer la commande</Button>
        </>}
        {o.status === 'ORDERED' && canWrite(user, 'MANAGER', 'OPERATOR') && (
          <Button disabled={busy} onClick={() => act('receive', 'Confirmer la réception ? Le stock sera augmenté.')}>Marquer comme reçue (entrée en stock)</Button>
        )}
        {['DRAFT', 'ORDERED'].includes(o.status) && manager && (
          <Button variant="danger" disabled={busy} onClick={() => act('cancel', 'Annuler cette commande ?')}>Annuler</Button>
        )}
      </div>
    </>
  );
}
