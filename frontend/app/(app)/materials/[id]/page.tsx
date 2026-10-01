'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { IconCart } from '@/components/icons';
import { canWrite } from '@/components/Shell';
import { Badge, Breadcrumb, Button, Card, ErrorText, Loading, PageHeader, Sku, Stat, StockGauge, Table, buttonClass, cx } from '@/components/ui';
import { api, getUser, money, num } from '@/lib/api';
import { useApi, usePaged } from '@/lib/hooks';
import { characteristicValue, convert, purchaseLink, reorderQuantity, stockState } from '@/lib/stock';

const linkClass = 'text-[13px] font-medium text-accent hover:underline';
const MOVE_LABEL: Record<string, string> = {
  ENTRY: 'Entrée', EXIT: 'Sortie', PRODUCTION: 'Production', LOSS: 'Perte', RETURN: 'Retour', ADJUSTMENT: 'Ajustement',
};
const when = (iso: string) => {
  const d = new Date(iso);
  const days = Math.floor((new Date(new Date().toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

export default function MaterialPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const material = useApi<any>(`/materials/${id}`);
  const moves = usePaged('/stock-movements', { materialId: id }, 5);
  const [error, setError] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const manager = canWrite(getUser(), 'MANAGER');

  async function remove() {
    setError(undefined);
    try {
      const r = await api(`/materials/${id}`, { method: 'DELETE' });
      if (r?.deactivated) { setConfirmDelete(false); material.reload(); } else router.push('/materials');
    } catch (err) { setError((err as Error).message); setConfirmDelete(false); }
  }

  if (material.error) return <ErrorText>{material.error}</ErrorText>;
  const m = material.data;
  if (!m) return <Loading />;

  const u = m.unit.symbol;
  const qty = Number(m.stock?.quantity ?? 0), min = Number(m.stock?.minimumQuantity ?? 0);
  const max = m.stock?.maximumQuantity == null ? null : Number(m.stock.maximumQuantity);
  const st = stockState(qty, min);
  const cost = Number(m.unitCost);
  const order = purchaseLink([{ materialId: m.id, quantity: reorderQuantity(qty, min, max), unitId: m.unitId }]);

  return (
    <>
      <Breadcrumb items={[['Matières', '/materials'], [m.name]]} />
      <PageHeader
        title={m.name}
        badge={m.active ? <Badge tone={st.tone}>{st.label}</Badge> : <Badge plain>Inactive</Badge>}
        meta={<>
          <Sku>{m.sku}</Sku><span aria-hidden>·</span><span>{m.unit.category?.name ?? 'Unité'} · stock en {m.unit.name.toLowerCase()} ({u})</span>
          {m.description && <><span aria-hidden>·</span><span>{m.description}</span></>}
        </>}
        actions={manager && (confirmDelete ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-danger bg-surface px-3 py-1.5 text-[13px] text-danger">
            <span>Supprimer cette matière ? Si elle est utilisée, elle sera seulement désactivée.</span>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Annuler</Button>
            <Button variant="danger" size="sm" onClick={remove}>Supprimer</Button>
          </div>
        ) : (<>
          {m.active && <Button variant="ghost-danger" onClick={() => setConfirmDelete(true)}>Supprimer</Button>}
          <Link href={`/materials/${id}/edit`} className={buttonClass('secondary')}>Modifier</Link>
          {m.active && <Link href={order} className={buttonClass('primary')}><IconCart />Commander</Link>}
        </>))}
      />
      <ErrorText>{error}</ErrorText>

      <section className="grid gap-5 sm:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-2 rounded-[14px] border border-line bg-surface px-4 py-4 shadow-card sm:px-6 sm:py-5">
          <span className="text-xs font-medium tracking-wider text-ink-muted uppercase">Stock actuel</span>
          <span className="text-2xl leading-8 font-medium tabular-nums sm:text-[30px] sm:leading-9">{num(qty)}<span className="ml-1.5 text-base text-ink-muted">{u}</span></span>
          <StockGauge quantity={qty} minimum={min} maximum={max} tone={st.tone} className="mt-1 h-2" />
          <div className="flex justify-between text-xs text-ink-muted tabular-nums">
            <span>{min > 0 ? `Min. ${num(min)} ${u}` : 'Pas de seuil'}</span>{max !== null && <span>Max. {num(max)} {u}</span>}
          </div>
        </div>
        <Stat label="Coût unitaire" value={cost ? money(cost) : '—'} unit={cost ? `/ ${u}` : undefined} meta="Coût moyen, mis à jour à chaque réception" />
        <Stat label="Valeur en stock" value={money(qty * cost)} meta={`${num(qty)} ${u} × ${money(cost)}`} />
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card title="Caractéristiques">
            {m.characteristics.length === 0 ? <p className="text-sm text-ink-muted">Aucune caractéristique renseignée.</p> : (
              <dl className="grid grid-cols-[minmax(0,10rem)_1fr]">
                {m.characteristics.map((c: any, i: number) => {
                  const last = i === m.characteristics.length - 1;
                  return [
                    <dt key={`t${c.characteristicId}`} className={cx('py-2.5 text-ink-muted', !last && 'border-b border-line')}>{c.characteristic.name}</dt>,
                    <dd key={`d${c.characteristicId}`} className={cx('py-2.5 tabular-nums', !last && 'border-b border-line')}>{characteristicValue(c)}</dd>,
                  ];
                })}
              </dl>
            )}
          </Card>

          <Card title="Utilisée dans" subtitle="Produits dont la nomenclature contient cette matière">
            {!m.products?.length ? <p className="text-sm text-ink-muted">Aucun produit n'utilise cette matière.</p> : (
              <Table head={['Produit', '>Par pièce', '>Pièces possibles']}>
                {m.products.map((l: any) => {
                  const per = convert(Number(l.quantity), l.unit, m.unit);
                  const possible = per > 0 ? Math.floor(qty / per) : 0;
                  return (
                    <tr key={l.id} className={cx(!l.product.active && 'opacity-60')}>
                      <td><Link href={`/products/${l.product.id}`} className="font-medium hover:text-accent hover:underline">{l.product.name}</Link><div><Sku>{l.product.sku}</Sku></div></td>
                      <td className="text-right tabular-nums">{num(l.quantity)} {l.unit.symbol}</td>
                      <td className={cx('text-right font-medium tabular-nums', possible === 0 && 'text-danger')}>{num(possible)} pcs</td>
                    </tr>
                  );
                })}
              </Table>
            )}
          </Card>
        </div>

        <Card title="Derniers mouvements" action={<Link href="/stock" className={linkClass}>Historique</Link>}>
          {moves.loading ? <Loading /> : moves.items.length === 0 ? <p className="text-sm text-ink-muted">Aucun mouvement pour cette matière.</p> : (
            <ul className="flex flex-col">
              {moves.items.map((mv: any) => {
                const q = Number(mv.quantity);
                return (
                  <li key={mv.id} className="flex items-center gap-3.5 border-b border-line py-3 last:border-b-0">
                    <span className={cx('w-20 shrink-0 text-right font-medium tabular-nums', q > 0 && 'text-success', mv.type === 'LOSS' && 'text-danger')}>
                      {q > 0 ? '+' : '−'}{num(Math.abs(q))} {mv.unit.symbol}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{MOVE_LABEL[mv.type] ?? mv.type}</div>
                      <div className="truncate text-xs text-ink-muted">{mv.reason}{mv.reason && mv.reference && ' · '}{mv.reference && <Sku>{mv.reference}</Sku>}</div>
                    </div>
                    <span className="text-xs whitespace-nowrap text-ink-muted">{when(mv.createdAt)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
