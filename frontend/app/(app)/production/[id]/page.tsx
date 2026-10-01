'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { canWrite } from '@/components/Shell';
import { Badge, Breadcrumb, Button, Card, ErrorText, Loading, PageHeader, Sku, Stat, Table, cx } from '@/components/ui';
import { ApiError, api, getUser, money, num } from '@/lib/api';
import { productionRef } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import { PRODUCTION_STATUS, bomUnitCost } from '@/lib/stock';

const isCancellation = (m: any) => typeof m.reason === 'string' && m.reason.startsWith('Cancellation');

export default function ProductionDetail() {
  const { id } = useParams<{ id: string }>();
  const prod = useApi<any>(`/production/${id}`);
  const product = useApi<any>(prod.data ? `/products/${prod.data.productId}` : null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const manager = canWrite(getUser(), 'MANAGER');

  async function cancel() {
    setBusy(true); setError(undefined);
    try { await api(`/production/${id}/cancel`, { method: 'POST' }); setConfirm(false); prod.reload(); }
    catch (e) {
      setError(e instanceof ApiError && e.status === 409 && /no longer in stock/.test(e.message)
        ? "Impossible d'annuler : les pièces fabriquées ne sont plus en stock (déjà vendues ou sorties)."
        : (e as Error).message);
    } finally { setBusy(false); }
  }

  if (prod.error) return <ErrorText>{prod.error}</ErrorText>;
  const p = prod.data;
  if (!p) return <Loading />;

  const ref = productionRef(p.id);
  const qty = Number(p.quantity);
  const [label, tone] = PRODUCTION_STATUS[p.status] ?? [p.status, 'gray'];
  const original = p.movements.filter((m: any) => !isCancellation(m));
  const consumed = original.filter((m: any) => m.materialId);
  const madeUnit = original.find((m: any) => m.productId)?.unit.symbol ?? 'pcs';
  const unitCost = product.data ? bomUnitCost(product.data.materials) : undefined;

  return (
    <>
      <Breadcrumb items={[['Production', '/production'], [ref]]} />
      <PageHeader
        title={ref}
        badge={<Badge tone={tone}>{label}</Badge>}
        meta={<>
          <Link href={`/products/${p.productId}`} className="font-medium text-ink hover:text-accent hover:underline">{num(qty)} × {p.product.name}</Link>
          <span aria-hidden>·</span><span>{new Date(p.createdAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}</span>
          <span aria-hidden>·</span><span>par {p.user.firstName} {p.user.lastName}</span>
        </>}
        actions={manager && p.status === 'COMPLETED' && !confirm && <Button variant="ghost-danger" onClick={() => setConfirm(true)}>Annuler la production</Button>}
      />
      <ErrorText>{error}</ErrorText>

      {confirm && (
        <section className="flex flex-col gap-3 rounded-[14px] border border-danger bg-surface p-4 sm:p-6">
          <h2 className="text-base font-semibold text-danger">Annuler cette production ?</h2>
          <p className="max-w-2xl">
            Les {num(qty)} {madeUnit} de {p.product.name} seront retirés du stock et les matières consommées y reviendront
            ({consumed.map((m: any) => `${num(Math.abs(Number(m.quantity)))} ${m.unit.symbol} de ${m.material?.name}`).join(', ')}).
            Impossible si les pièces ont déjà été vendues.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setConfirm(false)}>Garder la production</Button>
            <Button variant="danger" disabled={busy} onClick={cancel}>Annuler la production</Button>
          </div>
        </section>
      )}

      <section className="grid gap-5 sm:grid-cols-3">
        <Stat label="Pièces fabriquées" value={num(qty)} unit={madeUnit} meta={p.status === 'CANCELLED' ? 'Retirées du stock à l\'annulation' : `Ajoutées au stock de ${p.product.name}`} />
        <Stat label="Matières consommées" value={num(consumed.length)} meta={consumed.map((m: any) => m.material?.name).join(', ') || '—'} />
        <Stat label="Coût matière" value={unitCost === undefined ? '…' : money(unitCost * qty)} meta={unitCost === undefined ? undefined : `${money(unitCost)} par pièce, au coût actuel`} />
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card title="Matières consommées" subtitle="Déduites du stock à la validation, selon la nomenclature">
          {consumed.length === 0 ? <p className="text-sm text-ink-muted">Aucune matière enregistrée.</p> : (
            <Table head={['Matière', '>Par pièce', '>Consommé']}>
              {consumed.map((m: any) => {
                const used = Math.abs(Number(m.quantity));
                return (
                  <tr key={m.id}>
                    <td><Link href={`/materials/${m.material?.id}`} className="font-medium hover:text-accent hover:underline">{m.material?.name}</Link></td>
                    <td className="text-right text-ink-muted tabular-nums">{num(qty ? used / qty : 0)} {m.unit.symbol}</td>
                    <td className="text-right font-medium tabular-nums">−{num(used)} {m.unit.symbol}</td>
                  </tr>
                );
              })}
            </Table>
          )}
        </Card>

        <Card title="Mouvements de stock" action={<Link href="/stock?tab=history" className="text-[13px] font-medium text-accent hover:underline">Historique</Link>}>
          <ul className="flex flex-col">
            {p.movements.map((m: any) => {
              const q = Number(m.quantity), cancel = isCancellation(m);
              return (
                <li key={m.id} className="flex items-center gap-3.5 border-b border-line py-3 last:border-b-0">
                  <span className={cx('w-20 shrink-0 text-right font-medium tabular-nums', q > 0 && 'text-success')}>{q > 0 ? '+' : '−'}{num(Math.abs(q))} {m.unit.symbol}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{m.material?.name ?? p.product.name}</div>
                    <div className="text-xs text-ink-muted">{cancel ? 'Annulation' : m.productId ? 'Produit fini ajouté' : 'Consommation'}</div>
                  </div>
                  <Sku>{m.reference}</Sku>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </>
  );
}
