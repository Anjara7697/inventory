'use client';
import Link from 'next/link';
import { canWrite } from '@/components/Shell';
import { Badge, Card, ErrorText, Table } from '@/components/ui';
import { getUser, num } from '@/lib/api';
import { useApi } from '@/lib/hooks';

export default function Materials() {
  const { data, error } = useApi<any[]>('/materials');
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Matières</h1>
        {canWrite(getUser(), 'MANAGER') && <Link href="/materials/new" className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">Nouvelle matière</Link>}
      </div>
      <ErrorText>{error}</ErrorText>
      <Card>
        <Table head={['SKU', 'Nom', 'Caractéristiques', 'Stock', 'Seuil min.']}>
          {data?.map((m) => {
            const low = m.stock && Number(m.stock.quantity) <= Number(m.stock.minimumQuantity);
            return (
              <tr key={m.id}>
                <td className="font-mono text-xs">{m.sku}</td>
                <td>{canWrite(getUser(), 'MANAGER') ? <Link className="underline" href={`/materials/${m.id}`}>{m.name}</Link> : m.name}</td>
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
