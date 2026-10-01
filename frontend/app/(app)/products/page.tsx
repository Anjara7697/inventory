'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IconPlus } from '@/components/icons';
import { canWrite } from '@/components/Shell';
import { Badge, Card, ErrorText, Input, PageHeader, Pager, Sku, Table, buttonClass, cx } from '@/components/ui';
import { api, getUser, num } from '@/lib/api';
import { useDebounced, usePaged } from '@/lib/hooks';
import { stockState } from '@/lib/stock';

const IconSearch = () => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
);
const Chevron = () => <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden><path d="M9 6l6 6-6 6" /></svg>;

export default function Products() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [inactive, setInactive] = useState(false);
  const q = useDebounced(search);
  const list = usePaged('/products', { search: q, includeInactive: inactive ? 'true' : undefined });
  const manager = canWrite(getUser(), 'MANAGER');
  const [error, setError] = useState<string>();

  async function reactivate(id: number) {
    setError(undefined);
    try { await api(`/products/${id}`, { method: 'PATCH', body: { active: true } }); list.reload(); }
    catch (e) { setError((e as Error).message); }
  }

  return (
    <>
      <PageHeader
        title="Produits"
        overline={`${list.total} produit${list.total > 1 ? 's' : ''} fini${list.total > 1 ? 's' : ''}`}
        actions={manager && <Link href="/products/new" className={buttonClass('primary')}><IconPlus />Nouveau produit</Link>}
      />

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative max-w-sm min-w-60 flex-1">
          <span className="pointer-events-none absolute top-2.5 left-3 text-ink-muted"><IconSearch /></span>
          <Input className="pl-10" placeholder="Rechercher par nom ou SKU" aria-label="Rechercher un produit" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input type="checkbox" className="h-4 w-4 accent-accent" checked={inactive} onChange={(e) => setInactive(e.target.checked)} /> Afficher les inactifs
        </label>
      </div>

      <ErrorText>{list.error ?? error}</ErrorText>
      <Card flush>
        <Table head={['Produit', 'Nomenclature', '>Stock', '>Seuil min.', 'État', '']}>
          {list.items.map((p) => {
            const qty = Number(p.stock?.quantity ?? 0), min = Number(p.stock?.minimumQuantity ?? 0);
            const st = stockState(qty, min);
            return (
              <tr key={p.id} className={cx('cursor-pointer', !p.active && 'opacity-60')} onClick={() => router.push(`/products/${p.id}`)}>
                <td>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/products/${p.id}`} className="font-medium hover:text-accent" onClick={(e) => e.stopPropagation()}>{p.name}</Link>
                    {!p.active && <Badge plain>Inactif</Badge>}
                  </div>
                  <Sku>{p.sku}</Sku>
                </td>
                <td className="max-w-72 text-[13px] text-ink-muted">
                  {p.materials.length ? p.materials.map((l: any) => l.material.name).join(', ') : <span className="text-warning">Aucune matière</span>}
                </td>
                <td className="text-right tabular-nums">{num(qty)} pcs</td>
                <td className="text-right tabular-nums text-ink-muted">{min > 0 ? `${num(min)} pcs` : '—'}</td>
                <td>{p.active && <Badge tone={st.tone}>{st.label}</Badge>}</td>
                <td className="w-6 text-right text-ink-muted">
                  {!p.active && manager
                    ? <button className="text-[13px] font-medium text-accent hover:underline" onClick={(e) => { e.stopPropagation(); reactivate(p.id); }}>Réactiver</button>
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
