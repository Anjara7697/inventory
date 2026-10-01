'use client';
import { FormEvent, useState } from 'react';
import { canWrite } from '@/components/Shell';
import { Button, Card, ErrorText, Field, Input, Select, Table } from '@/components/ui';
import { api, getUser, num } from '@/lib/api';
import { useApi } from '@/lib/hooks';

type Kind = 'material' | 'product';

const TYPES: Record<Kind, [string, string][]> = {
  material: [['ENTRY', 'Entrée'], ['EXIT', 'Sortie'], ['LOSS', 'Perte'], ['RETURN', 'Retour'], ['ADJUSTMENT', 'Ajustement (±)']],
  product: [['ENTRY', 'Entrée (stock initial)'], ['EXIT', 'Sortie (vente, expédition)'], ['LOSS', 'Perte / casse'], ['RETURN', 'Retour client'], ['ADJUSTMENT', 'Ajustement (±)']],
};

export default function Stock() {
  const materials = useApi<any[]>('/materials');
  const products = useApi<any[]>('/products');
  const movements = useApi<any[]>('/stock-movements?limit=50');
  const stocks = useApi<any>('/inventory');
  const [kind, setKind] = useState<Kind>('material');
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<string>();
  const user = getUser();
  const items = kind === 'material' ? materials.data : products.data;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setError(undefined); setDone(undefined);
    try {
      await api('/stock-movements', { method: 'POST', body: {
        type: f.get('type'),
        [kind === 'material' ? 'materialId' : 'productId']: Number(f.get('itemId')),
        quantity: Number(f.get('quantity')),
        reason: (f.get('reason') as string) || undefined,
      } });
      form.reset(); setDone('Mouvement enregistré.'); movements.reload(); stocks.reload();
    } catch (err) { setError((err as Error).message); }
  }

  return (
    <>
      <h1 className="text-xl font-semibold">Stocks</h1>
      {canWrite(user, 'MANAGER', 'OPERATOR') && (
        <Card title="Nouveau mouvement">
          <div className="mb-3 flex gap-2">
            {(['material', 'product'] as Kind[]).map((k) => (
              <Button key={k} type="button" variant={kind === k ? 'primary' : 'ghost'} onClick={() => { setKind(k); setError(undefined); setDone(undefined); }}>
                {k === 'material' ? 'Matière première' : 'Produit fini'}
              </Button>
            ))}
          </div>
          <form key={kind} onSubmit={submit} className="grid gap-3 sm:grid-cols-5 sm:items-end">
            <Field label="Type"><Select name="type">{TYPES[kind].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
            <Field label={kind === 'material' ? 'Matière' : 'Produit'}>
              <Select name="itemId" required defaultValue="">
                <option value="" disabled>Choisir…</option>
                {items?.map((i) => <option key={i.id} value={i.id}>{i.name}{kind === 'material' ? ` (${i.unit.symbol})` : ''}</option>)}
              </Select>
            </Field>
            <Field label={kind === 'material' ? 'Quantité' : 'Quantité (pièces)'}><Input name="quantity" type="number" step="any" required /></Field>
            <Field label="Motif"><Input name="reason" maxLength={255} /></Field>
            <Button>Enregistrer</Button>
          </form>
          <div className="mt-3 space-y-2">
            <ErrorText>{error}</ErrorText>
            {done && <p className="text-sm text-green-700">{done}</p>}
          </div>
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Stock des matières">
          <Table head={['Matière', 'Quantité', 'Min.']}>
            {stocks.data?.materials.map((s: any) => (
              <tr key={s.id}><td>{s.material.name}</td><td>{num(s.quantity)} {s.material.unit.symbol}</td><td>{num(s.minimumQuantity)}</td></tr>
            ))}
          </Table>
        </Card>
        <Card title="Stock des produits finis">
          <Table head={['Produit', 'Quantité']}>
            {stocks.data?.products.map((s: any) => (
              <tr key={s.id}><td>{s.product.name}</td><td>{num(s.quantity)}</td></tr>
            ))}
          </Table>
        </Card>
      </div>
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
