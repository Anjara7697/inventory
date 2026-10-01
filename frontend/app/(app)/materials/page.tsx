'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IconPlus } from '@/components/icons';
import { canWrite } from '@/components/Shell';
import { Badge, Card, ErrorText, Input, PageHeader, Pager, Sku, StockGauge, Table, buttonClass, cx } from '@/components/ui';
import { api, getUser, money, num } from '@/lib/api';
import { useApi, useDebounced, usePaged } from '@/lib/hooks';
import { characteristicValue, stockState } from '@/lib/stock';

const IconSearch = () => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
);
const Chevron = () => <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden><path d="M9 6l6 6-6 6" /></svg>;

export default function Materials() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [inactive, setInactive] = useState(false);
  const [below, setBelow] = useState(false);
  const q = useDebounced(search);
  const list = usePaged('/materials', { search: q, includeInactive: inactive ? 'true' : undefined, belowThreshold: below ? 'true' : undefined });
  const belowCount = usePaged('/materials', { belowThreshold: 'true' }, 1);
  const user = getUser();
  const manager = canWrite(user, 'MANAGER');
  const value = useApi<any>(manager ? '/reports/stock-value' : null);
  const [error, setError] = useState<string>();

  async function reactivate(id: number) {
    setError(undefined);
    try { await api(`/materials/${id}`, { method: 'PATCH', body: { active: true } }); list.reload(); }
    catch (e) { setError((e as Error).message); }
  }

  const segment = (active: boolean) => cx('h-8 rounded-lg px-3 text-[13px] font-medium transition-colors',
    active ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink');

  return (
    <>
      <PageHeader
        title="Matières"
        overline={<>{list.total} matière{list.total > 1 ? 's' : ''} première{list.total > 1 ? 's' : ''}{value.data && <> · valeur du stock {money(value.data.totals.materials)}</>}</>}
        actions={manager && <Link href="/materials/new" className={buttonClass('primary')}><IconPlus />Nouvelle matière</Link>}
      />

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative max-w-sm min-w-60 flex-1">
          <span className="pointer-events-none absolute top-2.5 left-3 text-ink-muted"><IconSearch /></span>
          <Input className="pl-10" placeholder="Rechercher par nom ou SKU" aria-label="Rechercher une matière" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <div role="group" aria-label="Filtrer par état" className="flex gap-1 rounded-[10px] bg-sunken p-[3px]">
          <button aria-pressed={!below} className={segment(!below)} onClick={() => setBelow(false)}>Toutes</button>
          <button aria-pressed={below} className={segment(below)} onClick={() => setBelow(true)}>Sous le seuil · {belowCount.total}</button>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input type="checkbox" className="h-4 w-4 accent-accent" checked={inactive} onChange={(e) => setInactive(e.target.checked)} /> Afficher les inactives
        </label>
      </div>

      <ErrorText>{list.error ?? error}</ErrorText>
      <Card flush>
        <Table head={['Matière', 'Caractéristiques', '>Stock', '>Seuil min.', '>Coût unit.', 'État', '']}>
          {list.items.map((m) => {
            const qty = Number(m.stock?.quantity ?? 0), min = Number(m.stock?.minimumQuantity ?? 0);
            const st = stockState(qty, min);
            const u = m.unit.symbol;
            return (
              <tr key={m.id} className={cx('cursor-pointer', !m.active && 'opacity-60')} onClick={() => router.push(`/materials/${m.id}`)}>
                <td>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/materials/${m.id}`} className="font-medium hover:text-accent" onClick={(e) => e.stopPropagation()}>{m.name}</Link>
                    {!m.active && <Badge plain>Inactive</Badge>}
                  </div>
                  <Sku>{m.sku}</Sku>
                </td>
                <td>
                  <div className="flex max-w-72 flex-wrap gap-1">
                    {m.characteristics.map((c: any) => (
                      <span key={c.characteristicId} className="inline-flex h-6 items-center gap-1 rounded-md bg-sunken px-2 text-xs whitespace-nowrap">
                        <span className="font-medium text-ink-muted">{c.characteristic.name}</span>{characteristicValue(c)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="text-right">
                  <span className="tabular-nums">{num(qty)} {u}</span>
                  {m.active && <StockGauge quantity={qty} minimum={min} maximum={m.stock?.maximumQuantity} tone={st.tone} className="mt-1.5 ml-auto w-28" />}
                </td>
                <td className="text-right text-ink-muted tabular-nums">{min > 0 ? `${num(min)} ${u}` : '—'}</td>
                <td className="text-right whitespace-nowrap tabular-nums">{Number(m.unitCost) ? <>{money(m.unitCost)} <span className="text-ink-muted">/ {u}</span></> : '—'}</td>
                <td>{m.active && <Badge tone={st.tone}>{st.label}</Badge>}</td>
                <td className="w-6 text-right text-ink-muted">
                  {!m.active && manager
                    ? <button className="text-[13px] font-medium text-accent hover:underline" onClick={(e) => { e.stopPropagation(); reactivate(m.id); }}>Réactiver</button>
                    : <Chevron />}
                </td>
              </tr>
            );
          })}
        </Table>
        <div className="px-4 pb-1"><Pager page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} /></div>
      </Card>
    </>
  );
}
