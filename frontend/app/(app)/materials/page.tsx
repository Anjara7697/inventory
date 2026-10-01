'use client';
import Link from 'next/link';
import { useState } from 'react';
import { canWrite } from '@/components/Shell';
import { Badge, Card, ErrorText, Input, Pager, Table } from '@/components/ui';
import { api, getUser, num } from '@/lib/api';
import { useDebounced, usePaged } from '@/lib/hooks';

export default function Materials() {
  const [search, setSearch] = useState('');
  const [inactive, setInactive] = useState(false);
  const q = useDebounced(search);
  const list = usePaged('/materials', { search: q, includeInactive: inactive ? 'true' : undefined });
  const manager = canWrite(getUser(), 'MANAGER');

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Matières</h1>
        {manager && <Link href="/materials/new" className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">Nouvelle matière</Link>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Input className="max-w-xs" placeholder="Rechercher (nom, SKU)…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={inactive} onChange={(e) => setInactive(e.target.checked)} /> Afficher les inactives</label>
      </div>
      <ErrorText>{list.error}</ErrorText>
      <Card>
        <Table head={['SKU', 'Nom', 'Caractéristiques', 'Stock', 'Seuil min.', '']}>
          {list.items.map((m) => {
            const low = m.active && m.stock && Number(m.stock.quantity) <= Number(m.stock.minimumQuantity);
            return (
              <tr key={m.id} className={m.active ? '' : 'opacity-60'}>
                <td className="font-mono text-xs">{m.sku}</td>
                <td>{manager ? <Link className="underline" href={`/materials/${m.id}`}>{m.name}</Link> : m.name} {!m.active && <Badge tone="amber">Inactive</Badge>}</td>
                <td className="space-x-1">{m.characteristics.map((c: any) => <Badge key={c.characteristicId}>{c.characteristic.name}: {c.value}</Badge>)}</td>
                <td>{low ? <Badge tone="amber">{num(m.stock.quantity)} {m.unit.symbol}</Badge> : `${num(m.stock?.quantity)} ${m.unit.symbol}`}</td>
                <td>{num(m.stock?.minimumQuantity)} {m.unit.symbol}</td>
                <td className="text-right">{manager && !m.active && (
                  <button className="text-xs underline" onClick={async () => { await api(`/materials/${m.id}`, { method: 'PATCH', body: { active: true } }); list.reload(); }}>Réactiver</button>)}</td>
              </tr>
            );
          })}
        </Table>
        <Pager page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} />
      </Card>
    </>
  );
}
