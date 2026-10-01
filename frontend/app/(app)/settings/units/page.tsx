'use client';
import { FormEvent, useState } from 'react';
import { canWrite } from '@/components/Shell';
import { Button, Card, ErrorText, Field, Input, Select, Table } from '@/components/ui';
import { api, getUser, num } from '@/lib/api';
import { useApi } from '@/lib/hooks';

export default function UnitsSettings() {
  const cats = useApi<any[]>('/unit-categories');
  const [error, setError] = useState<string>();
  const writable = canWrite(getUser(), 'MANAGER');

  async function run(fn: () => Promise<unknown>, form?: HTMLFormElement) {
    setError(undefined);
    try { await fn(); form?.reset(); cats.reload(); } catch (e) { setError((e as Error).message); }
  }
  const addCategory = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    return run(() => api('/unit-categories', { method: 'POST', body: { name: f.get('name'), code: (f.get('code') as string).toUpperCase() } }), e.currentTarget);
  };
  const addUnit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    return run(() => api('/units', { method: 'POST', body: {
      name: f.get('name'), symbol: f.get('symbol'), code: (f.get('code') as string).toUpperCase(),
      categoryId: Number(f.get('categoryId')), conversionFactor: Number(f.get('conversionFactor')),
    } }), e.currentTarget);
  };
  const del = (path: string, label: string) => confirm(`Supprimer ${label} ?`) && run(() => api(path, { method: 'DELETE' }));

  return (
    <>
      <ErrorText>{error}</ErrorText>
      {writable && (
        <div className="grid gap-3 md:grid-cols-2">
          <Card title="Nouvelle catégorie">
            <form onSubmit={addCategory} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <Field label="Nom"><Input name="name" required maxLength={100} /></Field>
              <Field label="Code"><Input name="code" required maxLength={50} pattern="[A-Za-z0-9_]+" placeholder="LENGTH" /></Field>
              <Button>Ajouter</Button>
            </form>
          </Card>
          <Card title="Nouvelle unité">
            <form onSubmit={addUnit} className="grid grid-cols-2 items-end gap-2">
              <Field label="Nom"><Input name="name" required maxLength={100} /></Field>
              <Field label="Symbole"><Input name="symbol" required maxLength={20} /></Field>
              <Field label="Code"><Input name="code" required maxLength={50} pattern="[A-Za-z0-9_]+" /></Field>
              <Field label="Catégorie"><Select name="categoryId" required defaultValue="">
                <option value="" disabled>Choisir…</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
              <Field label="Facteur vers l'unité de référence"><Input name="conversionFactor" type="number" step="any" min="0.00000001" required defaultValue={1} /></Field>
              <Button>Ajouter</Button>
            </form>
          </Card>
        </div>
      )}
      {cats.data?.map((c) => (
        <Card key={c.id} title={`${c.name} (${c.code})`}>
          <Table head={['Unité', 'Symbole', 'Code', 'Facteur', '']}>
            {c.units.map((u: any) => (
              <tr key={u.id}>
                <td>{u.name}</td><td>{u.symbol}</td><td className="font-mono text-xs">{u.code}</td><td>{num(u.conversionFactor, 8)}</td>
                <td className="text-right">{writable && <button className="text-xs text-red-600 underline" onClick={() => del(`/units/${u.id}`, `l'unité ${u.name}`)}>Supprimer</button>}</td>
              </tr>
            ))}
          </Table>
          {writable && c.units.length === 0 && (
            <button className="mt-2 text-xs text-red-600 underline" onClick={() => del(`/unit-categories/${c.id}`, `la catégorie ${c.name}`)}>Supprimer la catégorie</button>
          )}
        </Card>
      ))}
    </>
  );
}
