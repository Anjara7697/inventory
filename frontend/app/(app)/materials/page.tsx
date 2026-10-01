'use client';
import { Badge, Card, ErrorText, Table } from '@/components/ui';
import { num } from '@/lib/api';
import { useApi } from '@/lib/hooks';

export default function Materials() {
  const { data, error } = useApi<any[]>('/materials');
  return (
    <>
      <h1 className="text-xl font-semibold">Matières</h1>
      <ErrorText>{error}</ErrorText>
      <Card>
        <Table head={['SKU', 'Nom', 'Caractéristiques', 'Stock', 'Seuil min.']}>
          {data?.map((m) => {
            const low = m.stock && Number(m.stock.quantity) <= Number(m.stock.minimumQuantity);
            return (
              <tr key={m.id}>
                <td className="font-mono text-xs">{m.sku}</td>
                <td>{m.name}</td>
                <td className="space-x-1">{m.characteristics.map((c: any) => <Badge key={c.characteristicId}>{c.characteristic.name}: {c.value}</Badge>)}</td>
                <td>{low ? <Badge tone="amber">{num(m.stock.quantity)} {m.unit.symbol}</Badge> : `${num(m.stock?.quantity)} ${m.unit.symbol}`}</td>
                <td>{num(m.stock?.minimumQuantity)} {m.unit.symbol}</td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </>
  );
}
