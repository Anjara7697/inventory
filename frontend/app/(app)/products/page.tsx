'use client';
import Link from 'next/link';
import { useState } from 'react';
import { canWrite } from '@/components/Shell';
import { Badge, Card, ErrorText, Input, Pager, Table } from '@/components/ui';
import { api, getUser, num } from '@/lib/api';
import { useDebounced, usePaged } from '@/lib/hooks';

export default function Products() {
  const [search, setSearch] = useState('');
  const [inactive, setInactive] = useState(false);
  const q = useDebounced(search);
  const list = usePaged('/products', { search: q, includeInactive: inactive ? 'true' : undefined });
  const manager = canWrite(getUser(), 'MANAGER');

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Produits</h1>
        {manager && <Link href="/products/new" className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">Nouveau produit</Link>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Input className="max-w-xs" placeholder="Rechercher (nom, SKU)…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={inactive} onChange={(e) => setInactive(e.target.checked)} /> Afficher les inactifs</label>
      </div>
      <ErrorText>{list.error}</ErrorText>
      <Card>
        <Table head={['SKU', 'Nom', 'Composants', 'Stock', '']}>
          {list.items.map((p) => (
            <tr key={p.id} className={p.active ? '' : 'opacity-60'}>
              <td className="font-mono text-xs">{p.sku}</td>
              <td><Link className="underline" href={`/products/${p.id}`}>{p.name}</Link> {!p.active && <Badge tone="amber">Inactif</Badge>}</td>
              <td>{p.materials.length}</td>
              <td>{num(p.stock?.quantity)}</td>
              <td className="text-right">{manager && !p.active && (
                <button className="text-xs underline" onClick={async () => { await api(`/products/${p.id}`, { method: 'PATCH', body: { active: true } }); list.reload(); }}>Réactiver</button>)}</td>
            </tr>
          ))}
        </Table>
        <Pager page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} />
      </Card>
    </>
  );
}
