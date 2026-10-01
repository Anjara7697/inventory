'use client';
import { FormEvent, useState } from 'react';
import { canWrite } from '@/components/Shell';
import { Button, Card, ErrorText, Field, Input, Select, Table } from '@/components/ui';
import { api, getUser, num } from '@/lib/api';
import { useApi } from '@/lib/hooks';

type Draft = Record<string, string>;

export default function UnitsSettings() {
  const cats = useApi<any[]>('/unit-categories');
  const [error, setError] = useState<string>();
  const [editing, setEditing] = useState<string>(); // "unit:3" | "cat:1"
  const [draft, setDraft] = useState<Draft>({});
  const writable = canWrite(getUser(), 'MANAGER');

  async function run(fn: () => Promise<unknown>, form?: HTMLFormElement) {
    setError(undefined);
    try { await fn(); form?.reset(); setEditing(undefined); cats.reload(); } catch (e) { setError((e as Error).message); }
  }
  const edit = (key: string, init: Draft) => { setEditing(key); setDraft(init); setError(undefined); };
  const field = (k: string, props: object = {}) => (
    <Input value={draft[k] ?? ''} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} {...props} />
  );

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
  const saveUnit = (id: number) => run(() => api(`/units/${id}`, { method: 'PATCH', body: {
    name: draft.name, symbol: draft.symbol, code: draft.code.toUpperCase(), conversionFactor: Number(draft.factor),
  } }));
  const saveCat = (id: number) => run(() => api(`/unit-categories/${id}`, { method: 'PATCH', body: { name: draft.name, code: draft.code.toUpperCase() } }));
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
        <Card key={c.id}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {editing === `cat:${c.id}` ? (
              <>
                <div className="w-48">{field('name', { maxLength: 100 })}</div>
                <div className="w-40">{field('code', { maxLength: 50, pattern: '[A-Za-z0-9_]+' })}</div>
                <Button onClick={() => saveCat(c.id)}>Enregistrer</Button>
                <Button variant="ghost" onClick={() => setEditing(undefined)}>Annuler</Button>
              </>
            ) : (
              <>
                <h2 className="text-sm font-semibold">{c.name} ({c.code})</h2>
                {writable && <button className="text-xs underline" onClick={() => edit(`cat:${c.id}`, { name: c.name, code: c.code })}>Modifier</button>}
                {writable && c.units.length === 0 && <button className="text-xs text-red-600 underline" onClick={() => del(`/unit-categories/${c.id}`, `la catégorie ${c.name}`)}>Supprimer</button>}
              </>
            )}
          </div>
          <Table head={['Unité', 'Symbole', 'Code', 'Facteur', '']}>
            {c.units.map((u: any) => editing === `unit:${u.id}` ? (
              <tr key={u.id}>
                <td>{field('name', { maxLength: 100 })}</td><td>{field('symbol', { maxLength: 20 })}</td>
                <td>{field('code', { maxLength: 50 })}</td><td>{field('factor', { type: 'number', step: 'any', min: '0.00000001' })}</td>
                <td className="space-x-2 whitespace-nowrap text-right">
                  <button className="text-xs underline" onClick={() => saveUnit(u.id)}>Enregistrer</button>
                  <button className="text-xs underline" onClick={() => setEditing(undefined)}>Annuler</button>
                </td>
              </tr>
            ) : (
              <tr key={u.id}>
                <td>{u.name}</td><td>{u.symbol}</td><td className="font-mono text-xs">{u.code}</td><td>{num(u.conversionFactor, 8)}</td>
                <td className="space-x-2 whitespace-nowrap text-right">{writable && <>
                  <button className="text-xs underline" onClick={() => edit(`unit:${u.id}`, { name: u.name, symbol: u.symbol, code: u.code, factor: String(Number(u.conversionFactor)) })}>Modifier</button>
                  <button className="text-xs text-red-600 underline" onClick={() => del(`/units/${u.id}`, `l'unité ${u.name}`)}>Supprimer</button>
                </>}</td>
              </tr>
            ))}
          </Table>
        </Card>
      ))}
      <p className="text-xs text-zinc-500">Une unité déjà utilisée (matière, nomenclature, mouvement, commande) ne peut plus changer de facteur de conversion.</p>
    </>
  );
}
