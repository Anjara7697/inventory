'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Fragment, useState } from 'react';
import { canWrite } from '@/components/Shell';
import { Badge, Breadcrumb, Button, Card, ErrorText, Loading, PageHeader, Sku, Table, buttonClass, cx } from '@/components/ui';
import { api, getUser, money, num } from '@/lib/api';
import { PURCHASE_STATUS, orderTotal, purchaseRef, shortDate } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import { convert } from '@/lib/stock';

const IconTruck = () => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></svg>
);
const IconSend = () => <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden><path d="M4 12l16-8-6 16-3-6z" /></svg>;

type Action = 'order' | 'receive' | 'cancel';

/** Brouillon → Commandée → Reçue, with dates. A cancelled order shows its own last step. */
function Stepper({ o }: { o: any }) {
  const steps: [string, string | null][] = [['Brouillon', o.createdAt], ['Commandée', o.orderedAt], o.status === 'CANCELLED' ? ['Annulée', null] : ['Reçue', o.receivedAt]];
  const current = { DRAFT: 0, ORDERED: 1, RECEIVED: 2, CANCELLED: 2 }[o.status as string] ?? 0;
  return (
    <ol className="grid grid-cols-3 items-start gap-2 rounded-[14px] border border-line bg-surface px-4 py-4 shadow-card sm:flex sm:items-center sm:gap-2.5 sm:px-6">
      {steps.map(([label, date], i) => {
        const done = i < current || (i === current && o.status === 'RECEIVED');
        const now = i === current && !done;
        const cancelled = o.status === 'CANCELLED' && i === 2;
        return (
          <Fragment key={label}>
            <li className="flex items-center gap-2.5" aria-current={now ? 'step' : undefined}>
              <span className={cx('grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-xs font-semibold',
                cancelled ? 'bg-danger-soft text-danger' : done || now ? 'bg-accent text-on-accent' : 'bg-sunken text-ink-muted')}>
                {cancelled ? '×' : done ? '✓' : i + 1}
              </span>
              <span>
                <span className={cx('block font-medium', !(done || now || cancelled) && 'text-ink-muted')}>{label}</span>
                <span className="block text-xs text-ink-muted">{date ? shortDate(date) : '—'}</span>
              </span>
            </li>
            {i < 2 && <li aria-hidden className={cx('hidden h-0.5 min-w-6 flex-1 sm:block', i < current ? 'bg-accent' : 'bg-line')} />}
          </Fragment>
        );
      })}
    </ol>
  );
}

export default function PurchasePage() {
  const { id } = useParams<{ id: string }>();
  const { data: o, error: loadError, reload } = useApi<any>(`/purchase-orders/${id}`);
  const inv = useApi<any>(o?.status === 'ORDERED' || o?.status === 'DRAFT' ? '/inventory' : null);
  const [confirm, setConfirm] = useState<Action>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const user = getUser();

  async function act(action: Action) {
    setBusy(true); setError(undefined);
    try { await api(`/purchase-orders/${id}/${action}`, { method: 'POST' }); setConfirm(undefined); await reload(); inv.reload(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  if (loadError) return <ErrorText>{loadError}</ErrorText>;
  if (!o) return <Loading />;
  const manager = canWrite(user, 'MANAGER');
  const receiver = canWrite(user, 'MANAGER', 'OPERATOR');
  const [label, tone] = PURCHASE_STATUS[o.status] ?? [o.status, 'gray'];
  const total = orderTotal(o);
  const ref = purchaseRef(o.id);

  /** Stock of the line's material now and after receipt, in the material's stock unit. */
  const stockOf = (l: any) => {
    const s = inv.data?.materials.find((m: any) => m.materialId === l.materialId);
    if (!s) return undefined;
    const added = convert(Number(l.quantity), l.unit, s.material.unit);
    return { unit: s.material.unit.symbol, now: Number(s.quantity), after: Number(s.quantity) + added };
  };
  const showStock = (o.status === 'ORDERED' || o.status === 'DRAFT') && !!inv.data;
  const receiptSummary = o.lines.map((l: any) => {
    const s = stockOf(l);
    return `${num(l.quantity)} ${l.unit.symbol} de ${l.material.name}${s ? ` (${num(s.now)} → ${num(s.after)} ${s.unit})` : ''}`;
  }).join(', ');

  return (
    <>
      <Breadcrumb items={[['Achats', '/purchases'], [ref]]} />
      <PageHeader
        title={ref}
        badge={<Badge tone={tone}>{label}</Badge>}
        meta={<>
          <span className="font-medium text-ink">{o.supplier.name}</span><span aria-hidden>·</span>
          <span>créée le {new Date(o.createdAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })} par {o.user.firstName}</span>
        </>}
        actions={!confirm && (<>
          {['DRAFT', 'ORDERED'].includes(o.status) && manager && <Button variant="ghost-danger" onClick={() => setConfirm('cancel')}>Annuler la commande</Button>}
          {o.status === 'DRAFT' && manager && <>
            <Link href={`/purchases/${id}/edit`} className={buttonClass('secondary')}>Modifier</Link>
            <Button onClick={() => setConfirm('order')}><IconSend />Passer la commande</Button>
          </>}
          {o.status === 'ORDERED' && receiver && <Button onClick={() => setConfirm('receive')}><IconTruck />Réceptionner</Button>}
        </>)}
      />

      <Stepper o={o} />
      <ErrorText>{error}</ErrorText>

      {confirm && (
        <section className={cx('flex flex-col gap-3 rounded-[14px] border bg-surface p-4 sm:p-6', confirm === 'cancel' ? 'border-danger' : 'border-accent')}>
          <h2 className={cx('text-base font-semibold', confirm === 'cancel' && 'text-danger')}>
            {confirm === 'receive' ? `Réceptionner ${ref} ?` : confirm === 'order' ? `Passer la commande ${ref} ?` : `Annuler ${ref} ?`}
          </h2>
          <p className="max-w-2xl">
            {confirm === 'receive' && <>Entreront en stock : {receiptSummary}. {o.lines.some((l: any) => l.unitPrice != null) && 'Le coût moyen des matières sera recalculé avec les prix de la commande.'}</>}
            {confirm === 'order' && <>La commande sera envoyée à {o.supplier.name} et ne pourra plus être modifiée. Le stock change seulement à la réception.</>}
            {confirm === 'cancel' && <>La commande sera annulée. Aucun mouvement de stock n'a encore été fait, rien ne change dans les stocks.</>}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setConfirm(undefined)}>{confirm === 'cancel' ? 'Garder la commande' : 'Pas encore'}</Button>
            {confirm === 'receive' && <Button disabled={busy} onClick={() => act('receive')}><IconTruck />Confirmer la réception</Button>}
            {confirm === 'order' && <Button disabled={busy} onClick={() => act('order')}><IconSend />Passer la commande</Button>}
            {confirm === 'cancel' && <Button variant="danger" disabled={busy} onClick={() => act('cancel')}>Annuler la commande</Button>}
          </div>
        </section>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card title="Lignes">
          <Table head={['Matière', '>Quantité', '>Prix unitaire', '>Montant', ...(showStock ? ['>Stock à la réception'] : [])]}>
            {o.lines.map((l: any) => {
              const s = showStock ? stockOf(l) : undefined;
              return (
                <tr key={l.id}>
                  <td><Link href={`/materials/${l.material.id}`} className="font-medium hover:text-accent hover:underline">{l.material.name}</Link><div><Sku>{l.material.sku}</Sku></div></td>
                  <td className="text-right whitespace-nowrap tabular-nums">{num(l.quantity)} {l.unit.symbol}</td>
                  <td className="text-right whitespace-nowrap tabular-nums">{l.unitPrice == null ? '—' : `${money(l.unitPrice)} / ${l.unit.symbol}`}</td>
                  <td className="text-right font-medium whitespace-nowrap tabular-nums">{l.unitPrice == null ? '—' : money(Number(l.unitPrice) * Number(l.quantity))}</td>
                  {showStock && <td className="text-right whitespace-nowrap tabular-nums">{s && <><span className="text-ink-muted">{num(s.now)}</span> → <strong className="font-medium text-success">{num(s.after)} {s.unit}</strong></>}</td>}
                </tr>
              );
            })}
          </Table>
          <div className="mt-3 flex justify-between border-t border-line pt-3">
            <span className="text-ink-muted">Total{o.lines.some((l: any) => l.unitPrice == null) && ' (lignes chiffrées)'}</span>
            <span className="font-semibold tabular-nums">{money(total)}</span>
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-5">
          <Card title="Fournisseur">
            <div className="flex flex-col gap-1">
              <span className="font-medium">{o.supplier.name}</span>
              {o.supplier.contact && <span className="text-[13px] text-ink-muted">{o.supplier.contact}</span>}
              {o.supplier.email && <span className="text-[13px] select-all">{o.supplier.email}</span>}
              {o.supplier.phone && <span className="text-[13px] tabular-nums select-all">{o.supplier.phone}</span>}
            </div>
          </Card>
          {o.notes && <Card title="Notes"><p className="whitespace-pre-line text-ink-muted">{o.notes}</p></Card>}
          {o.status === 'RECEIVED' && (
            <Card title="Réception">
              <p className="text-ink-muted">Reçue le {new Date(o.receivedAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })}. Les entrées en stock portent la référence <Sku>{ref}</Sku>.</p>
              <Link href="/stock?tab=history" className="mt-2 inline-block text-[13px] font-medium text-accent hover:underline">Voir dans l'historique des stocks</Link>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
