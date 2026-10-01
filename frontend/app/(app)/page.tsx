'use client';
import Link from 'next/link';
import { Badge, Card, ErrorText, Table } from '@/components/ui';
import { useApi } from '@/lib/hooks';
import { num } from '@/lib/api';

export default function Dashboard() {
  const { data, error, loading } = useApi<any>('/inventory');
  if (loading) return <p className="text-sm text-zinc-500">Chargement…</p>;
  if (error || !data) return <ErrorText>{error}</ErrorText>;
  const { materials, products, alerts } = data;

  return (
    <>
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Produits" value={products.length} />
        <Stat label="Matières" value={materials.length} />
        <Stat label="Alertes" value={alerts.length} tone={alerts.length ? 'text-red-600' : ''} />
      </div>
      <Card title="Matières bientôt épuisées">
        {alerts.length === 0 ? <p className="text-sm text-zinc-500">Aucune alerte.</p> : (
          <Table head={['Matière', 'Stock', 'Seuil min.', 'État']}>
            {alerts.map((a: any) => (
              <tr key={a.materialId}>
                <td>{a.name}</td><td>{num(a.quantity)} {a.unit}</td><td>{num(a.minimumQuantity)} {a.unit}</td>
                <td><Badge tone={a.type === 'OUT_OF_STOCK' ? 'red' : 'amber'}>{a.type === 'OUT_OF_STOCK' ? 'Rupture' : 'Stock faible'}</Badge></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Card title="Stock des produits finis">
        <Table head={['Produit', 'Stock']}>
          {products.map((s: any) => (
            <tr key={s.id}><td><Link className="underline" href={`/products/${s.productId}`}>{s.product.name}</Link></td><td>{num(s.quantity)}</td></tr>
          ))}
        </Table>
      </Card>
    </>
  );
}

const Stat = ({ label, value, tone = '' }: { label: string; value: number; tone?: string }) => (
  <Card><p className="text-xs text-zinc-500">{label}</p><p className={`text-2xl font-semibold ${tone}`}>{value}</p></Card>
);
