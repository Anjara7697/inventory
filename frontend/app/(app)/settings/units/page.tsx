'use client';
import { FormEvent, useState } from 'react';
import { IconPlus } from '@/components/icons';
import { ConfirmRow, RowActions } from '@/components/RowActions';
import { canWrite } from '@/components/Shell';
import { Button, Card, ErrorText, Field, Input, Loading, Table } from '@/components/ui';
import { api, getUser, num } from '@/lib/api';
import { useApi } from '@/lib/hooks';

type Draft = Record<string, string>;
const CODE = '[A-Za-z0-9_]+';

export default function UnitsSettings() {
  const cats = useApi<any[]>('/unit-categories');
  const [error, setError] = useState<string>();
  const [editing, setEditing] = useState<string>(); // "unit:3" | "cat:1" | "new-unit:1" | "new-cat"
  const [deleting, setDeleting] = useState<string>(); // "unit:3" | "cat:1"
  const [draft, setDraft] = useState<Draft>({});
  const writable = canWrite(getUser(), 'MANAGER');

  async function run(fn: () => Promise<unknown>) {
    setError(undefined);
    try { await fn(); setEditing(undefined); setDeleting(undefined); cats.reload(); } catch (e) { setError((e as Error).message); }
  }
  const start = (key: string, init: Draft) => { setEditing(key); setDeleting(undefined); setDraft(init); setError(undefined); };
  const input = (k: string, props: object = {}) => (
    <Input value={draft[k] ?? ''} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} {...props} />
  );
  const submit = (fn: () => Promise<unknown>) => (e: FormEvent) => { e.preventDefault(); run(fn); };

  const addCategory = () => api('/unit-categories', { method: 'POST', body: { name: draft.name, code: draft.code.toUpperCase() } });
  const saveCat = (id: number) => api(`/unit-categories/${id}`, { method: 'PATCH', body: { name: draft.name, code: draft.code.toUpperCase() } });
  const addUnit = (categoryId: number) => api('/units', { method: 'POST', body: {
    name: draft.name, symbol: draft.symbol, code: draft.code.toUpperCase(), categoryId, conversionFactor: Number(draft.factor),
  } });
  const saveUnit = (id: number) => api(`/units/${id}`, { method: 'PATCH', body: {
    name: draft.name, symbol: draft.symbol, code: draft.code.toUpperCase(), conversionFactor: Number(draft.factor),
  } });

  if (cats.loading) return <Loading />;
  return (
    <>
      <div className="-mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-[13px] text-ink-muted">
          Chaque catégorie a une unité de référence (facteur 1). Les autres unités s'y convertissent ; une unité déjà utilisée ne peut plus changer de facteur.
        </p>
        {writable && editing !== 'new-cat' && <Button variant="secondary" onClick={() => start('new-cat', { name: '', code: '' })}><IconPlus />Nouvelle catégorie</Button>}
      </div>
      <ErrorText>{error ?? cats.error}</ErrorText>

      {editing === 'new-cat' && (
        <Card title="Nouvelle catégorie">
          <form onSubmit={submit(addCategory)} className="flex flex-wrap items-end gap-3">
            <div className="w-56"><Field label="Nom">{input('name', { required: true, maxLength: 100, placeholder: 'Surface' })}</Field></div>
            <div className="w-44"><Field label="Code">{input('code', { required: true, maxLength: 50, pattern: CODE, placeholder: 'SURFACE', className: 'font-mono text-[13px]' })}</Field></div>
            <Button type="button" variant="ghost" onClick={() => setEditing(undefined)}>Annuler</Button>
            <Button>Ajouter la catégorie</Button>
          </form>
        </Card>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-2">
        {cats.data?.map((c) => {
          const ref = c.units.find((u: any) => Number(u.conversionFactor) === 1) ?? c.units[0];
          return (
            <Card key={c.id}>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                {editing === `cat:${c.id}` ? (
                  <form onSubmit={submit(() => saveCat(c.id))} className="flex flex-wrap items-end gap-2">
                    <div className="w-44">{input('name', { required: true, maxLength: 100, 'aria-label': 'Nom de la catégorie' })}</div>
                    <div className="w-36">{input('code', { required: true, maxLength: 50, pattern: CODE, 'aria-label': 'Code', className: 'font-mono text-[13px]' })}</div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(undefined)}>Annuler</Button>
                    <Button size="sm">Enregistrer</Button>
                  </form>
                ) : (
                  <div>
                    <h2 className="text-base font-semibold">{c.name} <span className="ml-1.5 font-mono text-[12.5px] font-normal text-ink-muted">{c.code}</span></h2>
                    <p className="text-[13px] text-ink-muted">{ref ? <>Unité de référence : {ref.symbol}</> : 'Aucune unité pour l\'instant'}</p>
                  </div>
                )}
                {writable && editing !== `cat:${c.id}` && (
                  <RowActions name={`la catégorie ${c.name}`} onEdit={() => start(`cat:${c.id}`, { name: c.name, code: c.code })}
                    onDelete={c.units.length === 0 ? () => { setDeleting(`cat:${c.id}`); setEditing(undefined); } : undefined} />
                )}
              </div>
              {deleting === `cat:${c.id}` && (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-danger-soft px-3 py-2 text-danger">
                  <span>Supprimer la catégorie {c.name} ?</span>
                  <span className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(undefined)}>Annuler</Button>
                    <Button variant="danger" size="sm" onClick={() => run(() => api(`/unit-categories/${c.id}`, { method: 'DELETE' }))}>Supprimer</Button>
                  </span>
                </div>
              )}

              {(c.units.length > 0 || editing === `new-unit:${c.id}`) && <Table head={['Unité', 'Symbole', 'Code', 'Conversion', '']}>
                {c.units.map((u: any) => {
                  const key = `unit:${u.id}`;
                  if (deleting === key) return (
                    <ConfirmRow key={u.id} colSpan={5} onCancel={() => setDeleting(undefined)} onConfirm={() => run(() => api(`/units/${u.id}`, { method: 'DELETE' }))}>
                      Supprimer l'unité {u.name} ({u.symbol}) ?
                    </ConfirmRow>
                  );
                  if (editing === key) return (
                    <tr key={u.id}>
                      <td>{input('name', { required: true, maxLength: 100, 'aria-label': 'Nom' })}</td>
                      <td><div className="w-20">{input('symbol', { required: true, maxLength: 20, 'aria-label': 'Symbole' })}</div></td>
                      <td><div className="w-28">{input('code', { required: true, maxLength: 50, 'aria-label': 'Code', className: 'font-mono text-[13px]' })}</div></td>
                      <td><div className="w-28">{input('factor', { type: 'number', step: 'any', min: '0.00000001', 'aria-label': `Facteur vers ${ref?.symbol ?? 'la référence'}`, className: 'text-right tabular-nums' })}</div></td>
                      <td className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(undefined)}>Annuler</Button>
                        <Button size="sm" onClick={() => run(() => saveUnit(u.id))}>Enregistrer</Button>
                      </td>
                    </tr>
                  );
                  const factor = Number(u.conversionFactor);
                  return (
                    <tr key={u.id}>
                      <td className="font-medium">{u.name}</td>
                      <td className="tabular-nums">{u.symbol}</td>
                      <td className="font-mono text-[12.5px] text-ink-muted">{u.code}</td>
                      <td className="whitespace-nowrap text-ink-muted tabular-nums">{factor === 1 ? (u.id === ref?.id ? 'référence' : `1 ${u.symbol} = 1 ${ref?.symbol}`) : `1 ${u.symbol} = ${num(factor, 8)} ${ref?.symbol ?? ''}`}</td>
                      <td>{writable && <RowActions name={`l'unité ${u.name}`}
                        onEdit={() => start(key, { name: u.name, symbol: u.symbol, code: u.code, factor: String(factor) })}
                        onDelete={() => { setDeleting(key); setEditing(undefined); }} />}</td>
                    </tr>
                  );
                })}
                {editing === `new-unit:${c.id}` && (
                  <tr>
                    <td>{input('name', { required: true, maxLength: 100, placeholder: 'Nom', 'aria-label': 'Nom' })}</td>
                    <td><div className="w-20">{input('symbol', { required: true, maxLength: 20, placeholder: 'dm', 'aria-label': 'Symbole' })}</div></td>
                    <td><div className="w-28">{input('code', { required: true, maxLength: 50, placeholder: 'DM', 'aria-label': 'Code', className: 'font-mono text-[13px]' })}</div></td>
                    <td>
                      <span className="flex items-center gap-1.5 whitespace-nowrap text-ink-muted">
                        1 {draft.symbol || '…'} =
                        <span className="w-24">{input('factor', { type: 'number', step: 'any', min: '0.00000001', 'aria-label': `Facteur vers ${ref?.symbol ?? 'la référence'}`, className: 'text-right tabular-nums' })}</span>
                        {ref?.symbol}
                      </span>
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(undefined)}>Annuler</Button>
                      <Button size="sm" disabled={!draft.name || !draft.symbol || !draft.code || !draft.factor} onClick={() => run(() => addUnit(c.id))}>Ajouter</Button>
                    </td>
                  </tr>
                )}
              </Table>}
              {writable && editing !== `new-unit:${c.id}` && (
                <Button variant="ghost-accent" className={c.units.length ? 'mt-3' : ''} onClick={() => start(`new-unit:${c.id}`, { name: '', symbol: '', code: '', factor: ref ? '' : '1' })}>
                  <IconPlus />Ajouter une unité
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
