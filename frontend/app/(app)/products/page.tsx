'use client';
import Link from 'next/link';
import { canWrite } from '@/components/Shell';
import { Card, ErrorText, Table } from '@/components/ui';
import { useApi } from '@/lib/hooks';
import { getUser, num } from '@/lib/api';

export default function Products() {
  const { data, error } = useApi<any[]>('/products');
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Produits</h1>
        {canWrite(getUser(), 'MANAGER') && <Link href="/products/new" className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">Nouveau produit</Link>}
      </div>
      <ErrorText>{error}</ErrorText>
      <Card>
        <Table head={['SKU', 'Nom', 'Composants', 'Stock']}>
          {data?.map((p) => (
            <tr key={p.id}>
              <td className="font-mono text-xs">{p.sku}</td>
              <td><Link className="underline" href={`/products/${p.id}`}>{p.name}</Link></td>
              <td>{p.materials.length}</td>
              <td>{num(p.stock?.quantity)}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
