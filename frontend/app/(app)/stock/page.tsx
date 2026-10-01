'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconPlus } from '@/components/icons';
import { DrawerInit, MovementDrawer } from '@/components/MovementDrawer';
import { canWrite } from '@/components/Shell';
import { Badge, Button, Card, ErrorText, Field, Input, Loading, PageHeader, Pager, Select, Sku, Stat, StockGauge, Table, cx } from '@/components/ui';
import { getUser, money, num } from '@/lib/api';
import { MOVE_LABEL, MOVE_TONE, dateTime, relativeDay } from '@/lib/format';
import { useApi, useDebounced, usePaged } from '@/lib/hooks';
import { stockState } from '@/lib/stock';

type Tab = 'materials' | 'products' | 'history';

const IconSearch = () => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
);
const IconMinus = () => <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden><path d="M5 12h14" /></svg>;
const IconPlus16 = () => <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden><path d="M12 5v14M5 12h14" /></svg>;

const isBelow = (s: any) => { const q = Number(s.quantity), min = Number(s.minimumQuantity); return q <= 0 || (min > 0 && q <= min); };
const weekAgo = () => new Date(Date.now() - 7 * 86_400_000).toISOString();

export default function Stock() {
  const user = getUser();
  const operator = canWrite(user, 'MANAGER', 'OPERATOR');
  const manager = canWrite(user, 'MANAGER');
  const inv = useApi<any>('/inventory');
  const [since] = useState(weekAgo);
  const recent = usePaged('/stock-movements', { from: since }, 1);

  const [tab, setTab] = useState<Tab>('materials');
  const [search, setSearch] = useState('');
  const [below, setBelow] = useState(false);
  const [drawer, setDrawer] = useState<DrawerInit | null>(null);
  const [done, setDone] = useState<string>();

  // Deep links: /stock?tab=history, /stock?new=1 (from the dashboard).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get('tab');
    if (t === 'products' || t === 'history') setTab(t);
    if (p.get('new') && operator) setDrawer({});
  }, [operator]);

  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reference, setReference] = useState('');
  const ref = useDebounced(reference);
  const movements = usePaged('/stock-movements', {
    type: typeFilter || undefined,
    from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
    to: dateTo ? new Date(`${dateTo}T23:59:59.999`).toISOString() : undefined,
    reference: ref || undefined,
  }, 20);

  const closeDrawer = useCallback(() => setDrawer(null), []);
  const onDone = (message: string) => { setDrawer(null); setDone(message); inv.reload(); movements.reload(); recent.reload(); };

  const materials: any[] = useMemo(() => inv.data?.materials ?? [], [inv.data]);
  const products: any[] = useMemo(() => inv.data?.products ?? [], [inv.data]);
  const needle = search.trim().toLowerCase();
  const filter = (rows: any[], item: (r: any) => any) => rows.filter((r) =>
    (!below || isBelow(r)) && (!needle || item(r).name.toLowerCase().includes(needle) || item(r).sku.toLowerCase().includes(needle)));

  if (inv.loading) return <Loading />;
  if (inv.error || !inv.data) return <ErrorText>{inv.error}</ErrorText>;

  const matValue = materials.reduce((s, r) => s + Number(r.quantity) * Number(r.material.unitCost ?? 0), 0);
  const pieces = products.reduce((s, r) => s + Number(r.quantity), 0);
  const alerts: any[] = inv.data.alerts;
  const out = alerts.filter((a) => a.type === 'OUT_OF_STOCK').length;
  const belowCount = (tab === 'products' ? products : materials).filter(isBelow).length;

  const tabs: [Tab, string, number][] = [['materials', 'Matières premières', materials.length], ['products', 'Produits finis', products.length], ['history', 'Historique', movements.total]];
  const segment = (on: boolean) => cx('h-8 rounded-lg px-3 text-[13px] font-medium transition-colors', on ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink');
  const quick = (kind: 'material' | 'product', itemId: number, name: string) => operator && (
    <span className="flex justify-end gap-0.5">
      <Button variant="ghost" size="icon-sm" aria-label={`Sortie de ${name}`} title="Sortie" onClick={(e) => { e.stopPropagation(); setDrawer({ kind, itemId, type: 'EXIT' }); }}><IconMinus /></Button>
      <Button variant="ghost" size="icon-sm" aria-label={`Entrée de ${name}`} title="Entrée" onClick={(e) => { e.stopPropagation(); setDrawer({ kind, itemId, type: 'ENTRY' }); }}><IconPlus16 /></Button>
    </span>
  );

  return (
    <>
      <PageHeader
        title="Stocks"
        overline={<>Valeur des matières {money(matValue)} · {alerts.length} alerte{alerts.length > 1 ? 's' : ''}</>}
        actions={operator && <Button onClick={() => setDrawer({ kind: tab === 'products' ? 'product' : 'material' })}><IconPlus />Nouveau mouvement</Button>}
      />

      {done && (
        <p role="status" className="flex items-center justify-between gap-3 rounded-lg bg-success-soft px-3 py-2 text-sm text-success">
          {done}<button className="text-[13px] font-medium underline" onClick={() => setDone(undefined)}>Fermer</button>
        </p>
      )}

      <section className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <Stat label="Matières en stock" value={num(materials.filter((r) => Number(r.quantity) > 0).length)} meta={`Sur ${materials.length} · valeur ${money(matValue)}`} />
        <Stat label="Pièces finies" value={num(pieces)} unit="pcs" meta={`${products.length} produit${products.length > 1 ? 's' : ''}`} />
        <Stat label="Sous le seuil" value={num(alerts.length)} meta={alerts.length === 0 ? 'Tout est au-dessus des seuils' : (
          <><strong className="font-medium text-danger">{out} rupture{out > 1 ? 's' : ''}</strong> · <strong className="font-medium text-warning">{alerts.length - out} faible{alerts.length - out > 1 ? 's' : ''}</strong></>
        )} />
        <Stat label="Mouvements (7 j)" value={num(recent.total)} meta="Entrées, sorties, productions" />
      </section>

      <div role="tablist" aria-label="Vue" className="flex gap-7 overflow-x-auto border-b border-line">
        {tabs.map(([id, label, count]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setBelow(false); }}
            className={cx('-mb-px inline-flex items-center gap-2 border-b-2 py-2.5 font-medium whitespace-nowrap transition-colors',
              tab === id ? 'border-accent text-ink' : 'border-transparent text-ink-muted hover:text-ink')}>
            {label}<span className="rounded-full bg-sunken px-2 text-xs text-ink-muted tabular-nums">{count}</span>
          </button>
        ))}
      </div>

      {tab !== 'history' ? (
        <>
          <div className="-mt-2 flex flex-wrap items-center gap-3">
            <label className="relative max-w-sm min-w-60 flex-1">
              <span className="pointer-events-none absolute top-2.5 left-3 text-ink-muted"><IconSearch /></span>
              <Input className="pl-10" aria-label="Rechercher" placeholder={tab === 'materials' ? 'Rechercher une matière' : 'Rechercher un produit'} value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <div role="group" aria-label="Filtrer par état" className="flex gap-1 rounded-[10px] bg-sunken p-[3px]">
              <button aria-pressed={!below} className={segment(!below)} onClick={() => setBelow(false)}>Tous</button>
              <button aria-pressed={below} className={segment(below)} onClick={() => setBelow(true)}>Sous le seuil · {belowCount}</button>
            </div>
          </div>

          <Card flush>
            {tab === 'materials' ? (
              <Table head={['Matière', '>Stock', '>Seuil min.', '>Valeur', 'État', 'Dernier mvt', '>Ajuster']}>
                {filter(materials, (r) => r.material).map((r) => {
                  const q = Number(r.quantity), min = Number(r.minimumQuantity), st = stockState(q, min), u = r.material.unit.symbol;
                  return (
                    <tr key={r.id}>
                      <td><Link href={`/materials/${r.materialId}`} className="font-medium hover:text-accent hover:underline">{r.material.name}</Link><div><Sku>{r.material.sku}</Sku></div></td>
                      <td className="text-right"><span className="tabular-nums">{num(q)} {u}</span><StockGauge quantity={q} minimum={min} maximum={r.maximumQuantity} tone={st.tone} className="mt-1.5 ml-auto w-28" /></td>
                      <td className="text-right text-ink-muted tabular-nums">{min > 0 ? `${num(min)} ${u}` : '—'}</td>
                      <td className="text-right tabular-nums">{money(q * Number(r.material.unitCost ?? 0))}</td>
                      <td><Badge tone={st.tone}>{st.label}</Badge></td>
                      <td className="text-[13px] whitespace-nowrap text-ink-muted">{relativeDay(r.lastMovementAt)}</td>
                      <td>{quick('material', r.materialId, r.material.name)}</td>
                    </tr>
                  );
                })}
              </Table>
            ) : (
              <Table head={['Produit', '>Stock', '>Seuil min.', 'État', 'Dernier mvt', '>Ajuster']}>
                {filter(products, (r) => r.product).map((r) => {
                  const q = Number(r.quantity), min = Number(r.minimumQuantity), st = stockState(q, min);
                  return (
                    <tr key={r.id}>
                      <td><Link href={`/products/${r.productId}`} className="font-medium hover:text-accent hover:underline">{r.product.name}</Link><div><Sku>{r.product.sku}</Sku></div></td>
                      <td className="text-right"><span className="tabular-nums">{num(q)} pcs</span><StockGauge quantity={q} minimum={min} tone={st.tone} className="mt-1.5 ml-auto w-28" /></td>
                      <td className="text-right text-ink-muted tabular-nums">{min > 0 ? `${num(min)} pcs` : '—'}</td>
                      <td><Badge tone={st.tone}>{st.label}</Badge></td>
                      <td className="text-[13px] whitespace-nowrap text-ink-muted">{relativeDay(r.lastMovementAt)}</td>
                      <td>{quick('product', r.productId, r.product.name)}</td>
                    </tr>
                  );
                })}
              </Table>
            )}
            <p className="px-4 pt-3 pb-1 text-[13px] text-ink-muted">Le trait sur la jauge marque le seuil minimum.</p>
          </Card>
        </>
      ) : (
        <>
          <div className="-mt-2 flex flex-wrap items-end gap-3">
            <div className="w-48"><Field label="Type">
              <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">Tous les types</option>
                {Object.entries(MOVE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field></div>
            <div className="w-40"><Field label="Du"><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></Field></div>
            <div className="w-40"><Field label="Au"><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></Field></div>
            <div className="w-52"><Field label="Référence"><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="ACH-0012, PROD-3…" className="font-mono text-[13px]" /></Field></div>
            {(typeFilter || dateFrom || dateTo || reference) && (
              <Button variant="ghost" onClick={() => { setTypeFilter(''); setDateFrom(''); setDateTo(''); setReference(''); }}>Effacer les filtres</Button>
            )}
          </div>
          <ErrorText>{movements.error}</ErrorText>
          <Card flush>
            <Table head={['Date', 'Type', 'Élément', '>Quantité', 'Référence', 'Par']}>
              {movements.items.map((m: any) => {
                const q = Number(m.quantity);
                const href = m.material ? `/materials/${m.material.id}` : `/products/${m.product?.id}`;
                return (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap text-ink-muted">{dateTime(m.createdAt)}</td>
                    <td><Badge tone={MOVE_TONE[m.type] ?? 'gray'}>{MOVE_LABEL[m.type] ?? m.type}</Badge></td>
                    <td>
                      <Link href={href} className="font-medium hover:text-accent hover:underline">{m.material?.name ?? m.product?.name}</Link>
                      {m.reason && <div className="text-xs text-ink-muted">{m.reason}</div>}
                    </td>
                    <td className={cx('text-right font-medium whitespace-nowrap tabular-nums', q > 0 && 'text-success', m.type === 'LOSS' && 'text-danger')}>
                      {q > 0 ? '+' : '−'}{num(Math.abs(q))} {m.unit.symbol}
                    </td>
                    <td>{m.reference && <Sku>{m.reference}</Sku>}</td>
                    <td>{m.user.firstName}</td>
                  </tr>
                );
              })}
            </Table>
            <div className="px-4 pb-1"><Pager page={movements.page} pageSize={movements.pageSize} total={movements.total} onPage={movements.setPage} /></div>
          </Card>
        </>
      )}

      <MovementDrawer open={!!drawer} init={drawer ?? {}} materials={materials} products={products} canAdjust={manager}
        onClose={closeDrawer} onDone={onDone} />
    </>
  );
}
