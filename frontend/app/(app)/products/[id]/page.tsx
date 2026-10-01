'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { IconFactory } from '@/components/icons';
import { canWrite } from '@/components/Shell';
import { Badge, Breadcrumb, Button, Card, ErrorText, Input, Loading, PageHeader, Sku, Stat, Table, buttonClass, cx } from '@/components/ui';
import { api, getUser, money, num } from '@/lib/api';
import { useApi, usePaged } from '@/lib/hooks';
import { PRODUCTION_STATUS, bomUnitCost, stockState } from '@/lib/stock';

const linkClass = 'text-[13px] font-medium text-accent hover:underline';
const plural = (n: number) => `${num(n)} pièce${n > 1 ? 's' : ''}`;

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const product = useApi<any>(`/products/${id}`);
  const capacity = useApi<any>(`/products/${id}/production-capacity`);
  const history = usePaged('/production', { productId: id }, 5);
  const [qty, setQty] = useState(10);
  const [check, setCheck] = useState<any>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const user = getUser();
  const manager = canWrite(user, 'MANAGER');

  async function runCheck(e?: FormEvent) {
    e?.preventDefault(); setError(undefined);
    try { setCheck(await api(`/products/${id}/check-production`, { method: 'POST', body: { quantity: qty } })); }
    catch (err) { setError((err as Error).message); }
  }

  async function produce(quantity: number) {
    setBusy(true); setError(undefined);
    try {
      const created = await api('/production', { method: 'POST', body: { productId: Number(id), quantity } });
      router.push(`/production/${created.id}`);
    } catch (err: any) {
      setError(err.body?.missing ? `Stock insuffisant : ${err.body.missing.map((m: any) => `il manque ${num(m.missing)} ${m.unit} de ${m.name}`).join(', ')}.` : err.message);
      setBusy(false);
    }
  }

  async function remove() {
    setError(undefined);
    try { await api(`/products/${id}`, { method: 'DELETE' }); router.push('/products'); }
    catch (err) { setError((err as Error).message); setConfirmDelete(false); }
  }

  if (product.error) return <ErrorText>{product.error}</ErrorText>;
  const p = product.data;
  if (!p) return <Loading />;

  const stockQty = Number(p.stock?.quantity ?? 0), min = Number(p.stock?.minimumQuantity ?? 0);
  const st = stockState(stockQty, min);
  const cap = capacity.data, maxNow = cap ? Number(cap.maximumProduction) : 0;
  const unitCost = bomUnitCost(p.materials);
  const limiting = new Set<string>(cap?.limitingMaterials ?? []);

  return (
    <>
      <Breadcrumb items={[['Produits', '/products'], [p.name]]} />
      <PageHeader
        title={p.name}
        badge={p.active ? <Badge tone={st.tone}>{st.label}</Badge> : <Badge plain>Inactif</Badge>}
        meta={<><Sku>{p.sku}</Sku>{p.description && <><span aria-hidden>·</span><span>{p.description}</span></>}</>}
        actions={manager && (confirmDelete ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-danger bg-surface px-3 py-1.5 text-[13px] text-danger">
            <span>Supprimer ce produit ? S'il a un historique, il sera seulement désactivé.</span>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Annuler</Button>
            <Button variant="danger" size="sm" onClick={remove}>Supprimer</Button>
          </div>
        ) : (<>
          <Button variant="ghost-danger" onClick={() => setConfirmDelete(true)}>Supprimer</Button>
          <Link href={`/products/${id}/edit`} className={buttonClass('secondary')}>Modifier</Link>
        </>))}
      />
      {!confirmDelete && <ErrorText>{check ? undefined : error}</ErrorText>}

      <section className="grid gap-5 sm:grid-cols-3">
        <Stat label="Stock actuel" value={num(stockQty)} unit="pcs" meta={min > 0 ? `Alerte sous ${num(min)} pcs` : 'Aucun seuil d\'alerte'} />
        <Stat label="Réalisable maintenant" value={cap ? num(maxNow) : '—'} unit={cap ? 'pcs' : undefined}
          meta={cap ? <>Limité par <strong className={cx('font-medium', maxNow === 0 ? 'text-danger' : 'text-warning')}>{cap.limitingMaterials.join(', ')}</strong></> : 'Pas de nomenclature'} />
        <Stat label="Coût matière" value={money(unitCost)} meta={`Par pièce · stock valorisé ${money(unitCost * stockQty)}`} />
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card title="Nomenclature" subtitle="Matières pour fabriquer 1 pièce" action={manager && <Link href={`/products/${id}/edit`} className={linkClass}>Modifier</Link>}>
            {p.materials.length === 0 ? (
              <p className="text-sm text-ink-muted">Aucune matière. Ajoutez la nomenclature pour pouvoir produire ce produit.</p>
            ) : (
              <Table head={['Matière', '>Par pièce', '>Disponible', '>Pièces possibles']}>
                {p.materials.map((l: any) => {
                  const c = cap?.materials.find((m: any) => m.materialId === l.materialId);
                  const isLimiting = limiting.has(l.material.name);
                  return (
                    <tr key={l.id} className={cx(isLimiting && '[&>td]:bg-warning-soft')}>
                      <td>
                        <div className="flex flex-wrap items-center gap-2 font-medium">{l.material.name}{isLimiting && <Badge tone="amber">Limitant</Badge>}</div>
                        <Sku>{l.material.sku}</Sku>
                      </td>
                      <td className="text-right tabular-nums">{num(l.quantity)} {l.unit.symbol}</td>
                      <td className="text-right tabular-nums">{c && `${num(c.available)} ${c.unit}`}</td>
                      <td className="text-right font-medium tabular-nums">{c && `${num(c.possibleProduction)} pcs`}</td>
                    </tr>
                  );
                })}
              </Table>
            )}
          </Card>

          <Card title="Historique de production" action={<Link href="/production" className={linkClass}>Tout voir</Link>}>
            {history.loading ? <Loading /> : history.items.length === 0 ? <p className="text-sm text-ink-muted">Ce produit n'a pas encore été produit.</p> : (
              <Table head={['Date', '>Quantité', 'Par', 'État']}>
                {history.items.map((h: any) => {
                  const [label, tone] = PRODUCTION_STATUS[h.status] ?? [h.status, 'gray'];
                  return (
                    <tr key={h.id}>
                      <td className="whitespace-nowrap">{new Date(h.createdAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                      <td className="text-right tabular-nums">{num(h.quantity)} pcs</td>
                      <td>{h.user.firstName}</td>
                      <td><Badge tone={tone}>{label}</Badge></td>
                    </tr>
                  );
                })}
              </Table>
            )}
          </Card>
        </div>

        {canWrite(user, 'MANAGER', 'OPERATOR') && p.active && p.materials.length > 0 && (
          <Card title="Lancer une production" subtitle="Les matières sont déduites du stock à la validation.">
            <div className="flex flex-col gap-4">
              <form onSubmit={runCheck} className="flex items-end gap-2">
                <label className="grid flex-1 gap-1.5">
                  <span className="text-[13px] font-medium">Quantité à produire</span>
                  <Input type="number" min={1} step={1} value={qty} className="tabular-nums"
                    onChange={(e) => { setQty(Number(e.target.value)); setCheck(undefined); setError(undefined); }} />
                </label>
                <Button variant="secondary">Vérifier</Button>
              </form>

              {check && (
                <>
                  <ul className="flex flex-col">
                    {check.materials.map((l: any) => (
                      <li key={l.materialId} className="flex items-center gap-3 border-b border-line py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{l.name}</div>
                          <div className="text-xs text-ink-muted">{num(l.required)} {l.unit} nécessaires · {num(l.available)} {l.unit} disponibles</div>
                        </div>
                        {l.sufficient ? <Badge tone="green">Suffisant</Badge> : <Badge tone="red">Manque {num(l.missing)} {l.unit}</Badge>}
                      </li>
                    ))}
                  </ul>
                  <ErrorText>{error}</ErrorText>
                  {check.feasible ? (
                    <Button onClick={() => produce(qty)} disabled={busy}><IconFactory />Produire {plural(qty)}</Button>
                  ) : (
                    <>
                      <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2.5 text-[13px] leading-5 text-danger">
                        Stock insuffisant : {check.toBuy.map((b: any) => `il manque ${num(b.quantity)} ${b.unit} de ${b.name}`).join(', ')} pour {plural(qty)}.
                        {maxNow > 0 && ` Vous pouvez en produire ${num(maxNow)} maintenant.`}
                      </p>
                      <div className="flex flex-col gap-2">
                        {maxNow > 0 && <Button onClick={() => { setQty(maxNow); produce(maxNow); }} disabled={busy}><IconFactory />Produire {plural(maxNow)}</Button>}
                        {manager && (
                          <Link className={buttonClass('secondary')}
                            href={`/purchases/new?lines=${check.toBuy.map((b: any) => `${b.materialId}:${Number(b.quantity)}:${b.unitId}`).join(',')}`}>
                            Commander les matières manquantes
                          </Link>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
