'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { IconFactory, IconPlus } from '@/components/icons';
import { canWrite } from '@/components/Shell';
import { Badge, Card, ErrorText, Loading, PageHeader, Sku, Stat, Table, buttonClass, cx } from '@/components/ui';
import { api, apiList, getUser, money, num } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { purchaseLink, reorderQuantity, stockState } from '@/lib/stock';

const MOVE_LABEL: Record<string, string> = {
  ENTRY: 'Entrée', EXIT: 'Sortie', PRODUCTION: 'Production', LOSS: 'Perte', RETURN: 'Retour', ADJUSTMENT: 'Ajustement',
};

const when = (iso: string) => {
  const d = new Date(iso), now = new Date();
  const days = Math.floor((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000);
  if (days === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

const linkClass = 'text-[13px] font-medium text-accent hover:underline';

interface Capacity { product: { id: number; name: string }; maximumProduction: string; limitingMaterials: string[] }

export default function Dashboard() {
  const user = getUser();
  const manager = canWrite(user, 'MANAGER');
  const operator = canWrite(user, 'MANAGER', 'OPERATOR');
  const { data, error, loading } = useApi<any>('/inventory');
  const value = useApi<any>(manager ? '/reports/stock-value' : null);
  const [moves, setMoves] = useState<any[]>();
  const [capacity, setCapacity] = useState<Capacity[]>();

  useEffect(() => {
    apiList('/stock-movements?limit=5').then((r) => setMoves(r.items)).catch(() => setMoves([]));
  }, []);

  // Capacity per product: products without a bill of materials answer 400 and are skipped.
  useEffect(() => {
    if (!data) return;
    const ids: number[] = data.products.slice(0, 6).map((s: any) => s.productId);
    Promise.all(ids.map((id) => api<Capacity>(`/products/${id}/production-capacity`).catch(() => null)))
      .then((r) => setCapacity((r.filter(Boolean) as Capacity[]).sort((a, b) => Number(b.maximumProduction) - Number(a.maximumProduction))));
  }, [data]);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorText>{error}</ErrorText>;
  const { materials, products, alerts } = data;

  const out = alerts.filter((a: any) => a.type === 'OUT_OF_STOCK').length;
  const pieces = products.reduce((s: number, p: any) => s + Number(p.quantity), 0);
  const units = new Set(materials.map((m: any) => m.material.unit.symbol)).size;
  const matById = new Map<number, any>(materials.map((m: any) => [m.materialId, m]));
  const prodById = new Map<number, any>(products.map((p: any) => [p.productId, p]));
  const maxCap = Math.max(1, ...(capacity ?? []).map((c) => Number(c.maximumProduction)));

  const orderLink = (a: any) => {
    const m = matById.get(a.materialId);
    const qty = reorderQuantity(Number(a.quantity), Number(a.minimumQuantity), m?.maximumQuantity);
    return purchaseLink([{ materialId: a.materialId, quantity: qty, unitId: m?.material.unitId }]);
  };

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        overline={new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(/^./, (c) => c.toUpperCase())}
        actions={operator && (<>
          <Link href="/production" className={buttonClass('secondary')}><IconFactory />Lancer une production</Link>
          <Link href="/stock" className={buttonClass('primary')}><IconPlus />Nouveau mouvement</Link>
        </>)}
      />

      <section className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <Stat label="Produits finis" value={num(products.length)} meta={`${num(pieces)} pièce${pieces > 1 ? 's' : ''} en stock`} />
        <Stat label="Matières premières" value={num(materials.length)} meta={`Dans ${units} unité${units > 1 ? 's' : ''} de mesure`} />
        <Stat label="Alertes" value={num(alerts.length)} meta={alerts.length === 0 ? 'Tout est au-dessus des seuils' : (
          <><strong className="font-medium text-danger">{out} rupture{out > 1 ? 's' : ''}</strong> · <strong className="font-medium text-warning">{alerts.length - out} faible{alerts.length - out > 1 ? 's' : ''}</strong></>
        )} />
        {manager && value.data
          ? <Stat label="Valeur du stock" value={money(value.data.totals.total)} meta={`Dont matières ${money(value.data.totals.materials)}`} />
          : <Stat label="Pièces en stock" value={num(pieces)} meta="Tous produits finis" />}
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <Card title="Alertes de stock" action={<Link href="/stock" className={linkClass}>Voir les stocks</Link>}>
          {alerts.length === 0 ? <p className="text-sm text-ink-muted">Aucune alerte : tous les stocks sont au-dessus de leur seuil.</p> : (
            <Table head={['Élément', '>Stock', '>Seuil min.', 'État', '']}>
              {alerts.map((a: any) => {
                const isMat = a.kind === 'material';
                const sku = isMat ? matById.get(a.materialId)?.material.sku : prodById.get(a.productId)?.product.sku;
                return (
                  <tr key={`${a.kind}-${a.materialId ?? a.productId}`}>
                    <td>
                      <div className="flex flex-wrap items-center gap-2 font-medium">
                        <Link href={isMat ? `/materials/${a.materialId}` : `/products/${a.productId}`} className="hover:text-accent hover:underline">{a.name}</Link>
                        {!isMat && <Badge plain>Produit fini</Badge>}
                      </div>
                      {sku && <Sku>{sku}</Sku>}
                    </td>
                    <td className="text-right tabular-nums">{num(a.quantity)} {a.unit}</td>
                    <td className="text-right tabular-nums">{num(a.minimumQuantity)} {a.unit}</td>
                    <td><Badge tone={a.type === 'OUT_OF_STOCK' ? 'red' : 'amber'}>{a.type === 'OUT_OF_STOCK' ? 'Rupture' : 'Stock faible'}</Badge></td>
                    <td className="text-right">
                      {isMat
                        ? manager && <Link href={orderLink(a)} className={linkClass}>Commander</Link>
                        : <Link href={`/products/${a.productId}`} className={linkClass}>Produire</Link>}
                    </td>
                  </tr>
                );
              })}
            </Table>
          )}
        </Card>

        <Card title="Capacité de production" subtitle="Pièces réalisables avec le stock actuel">
          {capacity === undefined ? <Loading /> : capacity.length === 0 ? (
            <p className="text-sm text-ink-muted">Aucun produit n'a encore de nomenclature.</p>
          ) : (
            <ul className="flex flex-col gap-5">
              {capacity.map((c) => {
                const n = Number(c.maximumProduction);
                return (
                  <li key={c.product.id} className="flex flex-col gap-1.5">
                    <div className="flex justify-between gap-2">
                      <Link href={`/products/${c.product.id}`} className="font-medium hover:text-accent">{c.product.name}</Link>
                      <span className={cx('font-medium tabular-nums', n === 0 && 'text-danger')}>{num(n)} pcs</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-sunken" role="presentation">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(n / maxCap) * 100}%` }} />
                    </div>
                    <span className={cx('text-xs', n === 0 ? 'text-danger' : 'text-ink-muted')}>
                      {n === 0 ? `Bloqué : ${c.limitingMaterials.join(', ')} insuffisant` : `Limité par ${c.limitingMaterials.join(', ')}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card title="Stock des produits finis" action={<Link href="/products" className={linkClass}>Tous les produits</Link>}>
          {products.length === 0 ? <p className="text-sm text-ink-muted">Aucun produit pour l'instant.</p> : (
            <Table head={['Produit', '>Stock', 'État']}>
              {products.map((s: any) => {
                const st = stockState(Number(s.quantity), Number(s.minimumQuantity));
                return (
                  <tr key={s.id}>
                    <td><Link className="font-medium hover:text-accent hover:underline" href={`/products/${s.productId}`}>{s.product.name}</Link><div><Sku>{s.product.sku}</Sku></div></td>
                    <td className="text-right tabular-nums">{num(s.quantity)} pcs</td>
                    <td><Badge tone={st.tone}>{st.label}</Badge></td>
                  </tr>
                );
              })}
            </Table>
          )}
        </Card>

        <Card title="Derniers mouvements" action={<Link href="/stock" className={linkClass}>Historique</Link>}>
          {moves === undefined ? <Loading /> : moves.length === 0 ? <p className="text-sm text-ink-muted">Aucun mouvement enregistré.</p> : (
            <ul className="flex flex-col">
              {moves.map((m) => {
                const q = Number(m.quantity);
                return (
                  <li key={m.id} className="flex items-center gap-3.5 border-b border-line py-3 last:border-b-0">
                    <span className={cx('w-20 shrink-0 text-right font-medium tabular-nums', q > 0 && 'text-success', m.type === 'LOSS' && 'text-danger')}>
                      {q > 0 ? '+' : '−'}{num(Math.abs(q))} {m.unit.symbol}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{m.material?.name ?? m.product?.name}</div>
                      <div className="truncate text-xs text-ink-muted">
                        {MOVE_LABEL[m.type] ?? m.type}{m.reason ? ` · ${m.reason}` : ''}{m.reference && <> · <Sku>{m.reference}</Sku></>}
                      </div>
                    </div>
                    <span className="text-xs whitespace-nowrap text-ink-muted">{when(m.createdAt)}</span>
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
