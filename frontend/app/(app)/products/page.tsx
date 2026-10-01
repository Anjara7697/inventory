'use client';
import Link from 'next/link';
import { Card, ErrorText, Table } from '@/components/ui';
import { useApi } from '@/lib/hooks';
import { num } from '@/lib/api';

export default function Products() {
  const { data, error } = useApi<any[]>('/products');
  return (
    <>
      <h1 className="text-xl font-semibold">Produits</h1>
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
