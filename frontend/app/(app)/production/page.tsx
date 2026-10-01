'use client';
import Link from 'next/link';
import { Badge, Card, ErrorText, Table } from '@/components/ui';
import { num } from '@/lib/api';
import { useApi } from '@/lib/hooks';

export default function ProductionHistory() {
  const { data, error } = useApi<any[]>('/production');
  return (
    <>
      <h1 className="text-xl font-semibold">Production</h1>
      <p className="text-sm text-zinc-500">Pour lancer une production, ouvrez la page d'un produit.</p>
      <ErrorText>{error}</ErrorText>
      <Card title="Historique">
        <Table head={['#', 'Date', 'Produit', 'Quantité', 'Statut', 'Par']}>
          {data?.map((p) => (
            <tr key={p.id}>
              <td className="font-mono text-xs">PROD-{String(p.id).padStart(5, '0')}</td>
              <td>{new Date(p.createdAt).toLocaleString('fr-FR')}</td>
              <td><Link className="underline" href={`/products/${p.productId}`}>{p.product.name}</Link></td>
              <td>{num(p.quantity)}</td>
              <td><Badge tone={p.status === 'COMPLETED' ? 'green' : 'gray'}>{p.status}</Badge></td>
              <td>{p.user.firstName}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
