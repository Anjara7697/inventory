'use client';
import { FormEvent, useState } from 'react';
import { canWrite } from '@/components/Shell';
import { Button, Card, ErrorText, Field, Input, Select, Table } from '@/components/ui';
import { api, getUser, num } from '@/lib/api';
import { useApi } from '@/lib/hooks';

const TYPES: [string, string][] = [['ENTRY', 'Entrée'], ['EXIT', 'Sortie'], ['LOSS', 'Perte'], ['RETURN', 'Retour'], ['ADJUSTMENT', 'Ajustement (±)']];

export default function Stock() {
  const materials = useApi<any[]>('/materials');
  const movements = useApi<any[]>('/stock-movements?limit=50');
  const stocks = useApi<any>('/inventory');
  const [error, setError] = useState<string>();
  const user = getUser();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setError(undefined);
    try {
      await api('/stock-movements', { method: 'POST', body: {
        type: f.get('type'), materialId: Number(f.get('materialId')), quantity: Number(f.get('quantity')),
        reason: (f.get('reason') as string) || undefined,
      } });
      form.reset(); movements.reload(); stocks.reload();
    } catch (err) { setError((err as Error).message); }
  }

  return (
    <>
      <h1 className="text-xl font-semibold">Stocks</h1>
      {canWrite(user, 'MANAGER', 'OPERATOR') && (
        <Card title="Nouveau mouvement (matière)">
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-5 sm:items-end">
            <Field label="Type"><Select name="type">{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
            <Field label="Matière"><Select name="materialId" required>{materials.data?.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit.symbol})</option>)}</Select></Field>
            <Field label="Quantité"><Input name="quantity" type="number" step="any" required /></Field>
            <Field label="Motif"><Input name="reason" maxLength={255} /></Field>
            <Button>Enregistrer</Button>
          </form>
          <div className="mt-3"><ErrorText>{error}</ErrorText></div>
        </Card>
      )}
      <Card title="Stock des matières">
        <Table head={['Matière', 'Quantité', 'Min.', 'Max.']}>
          {stocks.data?.materials.map((s: any) => (
            <tr key={s.id}><td>{s.material.name}</td><td>{num(s.quantity)} {s.material.unit.symbol}</td><td>{num(s.minimumQuantity)}</td><td>{s.maximumQuantity ? num(s.maximumQuantity) : '—'}</td></tr>
          ))}
        </Table>
      </Card>
      <Card title="Historique des mouvements">
        <Table head={['Date', 'Type', 'Élément', 'Quantité', 'Référence', 'Par']}>
          {movements.data?.map((m) => (
            <tr key={m.id}>
              <td>{new Date(m.createdAt).toLocaleString('fr-FR')}</td><td>{m.type}</td>
              <td>{m.material?.name ?? m.product?.name}</td>
              <td className={Number(m.quantity) < 0 ? 'text-red-600' : 'text-green-700'}>{Number(m.quantity) > 0 ? '+' : ''}{num(m.quantity)} {m.unit.symbol}</td>
              <td className="font-mono text-xs">{m.reference}</td><td>{m.user.firstName}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
