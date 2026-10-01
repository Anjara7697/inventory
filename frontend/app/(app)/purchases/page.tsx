'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IconPlus } from '@/components/icons';
import { canWrite } from '@/components/Shell';
import { Badge, Card, ErrorText, PageHeader, Pager, Select, Stat, Table, buttonClass, cx } from '@/components/ui';
import { getUser, money, num } from '@/lib/api';
import { PURCHASE_STATUS, orderTotal, purchaseRef, relativeDay, shortDate } from '@/lib/format';
import { useApi, usePaged } from '@/lib/hooks';

const Chevron = () => <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden><path d="M9 6l6 6-6 6" /></svg>;

/** "Tissu Jean, Bouton +1" */
const summary = (o: any) => {
  const names = o.lines.map((l: any) => l.material.name);
  return names.length <= 2 ? names.join(', ') : `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
};

export default function Purchases() {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const list = usePaged('/purchase-orders', { status: status || undefined, supplierId: supplierId || undefined });
  const suppliers = useApi<any[]>('/suppliers');
  // counts per status for the filter and the KPIs (first 200 of each is plenty for the amounts)
  const all = usePaged('/purchase-orders', {}, 1);
  const drafts = usePaged('/purchase-orders', { status: 'DRAFT' }, 1);
  const ordered = usePaged('/purchase-orders', { status: 'ORDERED' }, 200);
  const received = usePaged('/purchase-orders', { status: 'RECEIVED' }, 200);
  const cancelled = usePaged('/purchase-orders', { status: 'CANCELLED' }, 1);
  const manager = canWrite(getUser(), 'MANAGER');

  const pending = ordered.items.reduce((t, o) => t + orderTotal(o), 0);
  const oldest = ordered.items.reduce<string | undefined>((d, o) => (!d || (o.orderedAt ?? o.createdAt) < d ? o.orderedAt ?? o.createdAt : d), undefined);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const thisMonth = received.items.filter((o) => o.receivedAt && o.receivedAt >= monthStart);
  const receivedValue = thisMonth.reduce((t, o) => t + orderTotal(o), 0);

  const filters: [string, string, number][] = [['', 'Toutes', all.total], ['DRAFT', 'Brouillons', drafts.total], ['ORDERED', 'Commandées', ordered.total], ['RECEIVED', 'Reçues', received.total], ['CANCELLED', 'Annulées', cancelled.total]];
  const segment = (on: boolean) => cx('h-8 rounded-lg px-3 text-[13px] font-medium transition-colors', on ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink');

  return (
    <>
      <PageHeader
        title="Achats"
        overline="Commandes fournisseurs · la réception fait entrer les matières en stock"
        actions={manager && <Link href="/purchases/new" className={buttonClass('primary')}><IconPlus />Nouvelle commande</Link>}
      />

      <section className="grid gap-5 sm:grid-cols-3">
        <Stat label="Brouillons" value={num(drafts.total)} meta={drafts.total ? 'À compléter puis à passer' : 'Aucun brouillon en cours'} />
        <Stat label="En attente de réception" value={num(ordered.total)}
          meta={ordered.total ? `${money(pending)} · plus ancienne : ${relativeDay(oldest, false).toLowerCase()}` : 'Rien en attente'} />
        <Stat label="Reçues ce mois" value={num(thisMonth.length)} meta={thisMonth.length ? `${money(receivedValue)} entrés en stock` : 'Aucune réception ce mois-ci'} />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Filtrer par statut" className="flex flex-wrap gap-1 rounded-[10px] bg-sunken p-[3px]">
          {filters.map(([v, l, n]) => (
            <button key={v} aria-pressed={status === v} className={segment(status === v)} onClick={() => setStatus(v)}>
              {l} <span className="text-ink-muted tabular-nums">{n}</span>
            </button>
          ))}
        </div>
        <div className="w-64 max-w-full">
          <Select aria-label="Fournisseur" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">Tous les fournisseurs</option>
            {suppliers.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>
      </div>

      <ErrorText>{list.error}</ErrorText>
      <Card flush>
        <Table head={['N°', 'Date', 'Fournisseur', 'Articles', '>Montant', 'Statut', '']}>
          {list.items.map((o: any) => {
            const [label, tone] = PURCHASE_STATUS[o.status] ?? [o.status, 'gray'];
            const total = orderTotal(o);
            return (
              <tr key={o.id} className={cx('cursor-pointer', o.status === 'CANCELLED' && 'opacity-60')} onClick={() => router.push(`/purchases/${o.id}`)}>
                <td><Link href={`/purchases/${o.id}`} onClick={(e) => e.stopPropagation()} className="font-mono text-[12.5px] font-medium hover:text-accent">{purchaseRef(o.id)}</Link></td>
                <td className="whitespace-nowrap text-ink-muted">{shortDate(o.createdAt)}</td>
                <td className="font-medium">{o.supplier.name}</td>
                <td className="text-[13px] text-ink-muted">{summary(o)}</td>
                <td className="text-right whitespace-nowrap tabular-nums">{total ? money(total) : '—'}</td>
                <td><Badge tone={tone}>{label}</Badge></td>
                <td className="w-6 text-right text-ink-muted"><Chevron /></td>
              </tr>
            );
          })}
        </Table>
        {list.total === 0 && !list.loading && <p className="px-4 pt-3 text-sm text-ink-muted">Aucune commande{status ? ' avec ce statut' : ''}.</p>}
        <div className="px-4 pb-1"><Pager page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} /></div>
      </Card>
    </>
  );
}
