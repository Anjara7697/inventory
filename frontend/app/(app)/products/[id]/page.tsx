'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { canWrite } from '@/components/Shell';
import { Badge, Button, Card, ErrorText, Field, Input, Table } from '@/components/ui';
import { api, getUser, num } from '@/lib/api';
import { useApi } from '@/lib/hooks';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const product = useApi<any>(`/products/${id}`);
  const capacity = useApi<any>(`/products/${id}/production-capacity`);
  const [qty, setQty] = useState(10);
  const [check, setCheck] = useState<any>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const user = getUser();

  async function runCheck(e?: FormEvent) {
    e?.preventDefault(); setError(undefined);
    try { setCheck(await api(`/products/${id}/check-production`, { method: 'POST', body: { quantity: qty } })); }
    catch (err) { setError((err as Error).message); }
  }

  async function produce() {
    setBusy(true); setError(undefined);
    try {
      await api('/production', { method: 'POST', body: { productId: Number(id), quantity: qty } });
      router.push('/production');
    } catch (err: any) {
      setError(err.body?.missing ? `Matières insuffisantes : ${err.body.missing.map((m: any) => `${m.name} (manque ${num(m.missing)} ${m.unit})`).join(', ')}` : err.message);
    } finally { setBusy(false); }
  }

  if (product.error) return <ErrorText>{product.error}</ErrorText>;
  const p = product.data;
  if (!p) return null;

  return (
    <>
      <p className="text-sm"><Link href="/products" className="underline">← Produits</Link></p>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold">{p.name}</h1><span className="font-mono text-xs text-zinc-500">{p.sku}</span>
      </div>
      {p.description && <p className="text-sm text-zinc-600 dark:text-zinc-400">{p.description}</p>}

      <div className="grid gap-3 md:grid-cols-2">
        <Card title="Stock actuel"><p className="text-3xl font-semibold">{num(p.stock?.quantity)} <span className="text-sm font-normal text-zinc-500">unités</span></p></Card>
        <Card title="Capacité de production">
          {capacity.error ? <p className="text-sm text-zinc-500">{capacity.error}</p> : capacity.data && (
            <>
              <p className="text-3xl font-semibold">{num(capacity.data.maximumProduction)} <span className="text-sm font-normal text-zinc-500">unités</span></p>
              <p className="text-xs text-zinc-500">Matière limitante : {capacity.data.limitingMaterials.join(', ')}</p>
            </>
          )}
        </Card>
      </div>

      <Card title="Nomenclature">
        <Table head={['Matière', 'Quantité', 'Disponible', 'Production possible']}>
          {p.materials.map((l: any) => {
            const c = capacity.data?.materials.find((m: any) => m.materialId === l.materialId);
            return (
              <tr key={l.id}>
                <td>{l.material.name}</td><td>{num(l.quantity)} {l.unit.symbol}</td>
                <td>{c && `${num(c.available)} ${c.unit}`}</td><td>{c && num(c.possibleProduction)}</td>
              </tr>
            );
          })}
        </Table>
      </Card>

      {canWrite(user, 'MANAGER', 'OPERATOR') && (
        <Card title="Produire">
          <form onSubmit={runCheck} className="flex flex-wrap items-end gap-3">
            <Field label="Quantité"><Input type="number" min={1} step={1} value={qty} onChange={(e) => { setQty(Number(e.target.value)); setCheck(undefined); }} className="w-28" /></Field>
            <Button variant="ghost">Vérifier les matières</Button>
          </form>
          <div className="mt-3 space-y-3">
            <ErrorText>{error}</ErrorText>
            {check && (
              <>
                <Table head={['Matière', 'Nécessaire', 'Disponible', 'Manquant']}>
                  {check.materials.map((l: any) => (
                    <tr key={l.materialId}>
                      <td>{l.name}</td><td>{num(l.required)} {l.unit}</td><td>{num(l.available)} {l.unit}</td>
                      <td>{l.sufficient ? <Badge tone="green">OK</Badge> : <Badge tone="red">{num(l.missing)} {l.unit} à acheter</Badge>}</td>
                    </tr>
                  ))}
                </Table>
                {check.feasible
                  ? <Button onClick={produce} disabled={busy}>Confirmer la production de {qty}</Button>
                  : <p className="text-sm text-red-600">Production impossible avec le stock actuel.</p>}
              </>
            )}
          </div>
        </Card>
      )}
    </>
  );
}
