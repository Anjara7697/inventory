'use client';
import { FormEvent, useState } from 'react';
import { canWrite } from '@/components/Shell';
import { Badge, Button, Card, ErrorText, Field, Input, Select, Table } from '@/components/ui';
import { api, getUser } from '@/lib/api';
import { useApi } from '@/lib/hooks';

const TYPES: Record<string, string> = { STRING: 'Texte', NUMBER: 'Nombre', BOOLEAN: 'Oui / Non' };

export default function CharacteristicsSettings() {
  const { data, reload } = useApi<any[]>('/characteristics');
  const [error, setError] = useState<string>();
  const writable = canWrite(getUser(), 'MANAGER');
  const [editing, setEditing] = useState<number>();
  const [draft, setDraft] = useState({ name: '', code: '', dataType: 'STRING' });

  async function save(id: number) {
    setError(undefined);
    try { await api(`/characteristics/${id}`, { method: 'PATCH', body: { ...draft, code: draft.code.toUpperCase() } }); setEditing(undefined); reload(); }
    catch (err) { setError((err as Error).message); }
  }

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
    setError(undefined);
    try {
      await api('/characteristics', { method: 'POST', body: { name: f.get('name'), code: (f.get('code') as string).toUpperCase(), dataType: f.get('dataType') } });
      form.reset(); reload();
    } catch (err) { setError((err as Error).message); }
  }
  async function del(c: any) {
    if (!confirm(`Supprimer « ${c.name} » ?`)) return;
    setError(undefined);
    try { await api(`/characteristics/${c.id}`, { method: 'DELETE' }); reload(); } catch (err) { setError((err as Error).message); }
  }

  return (
    <>
      <ErrorText>{error}</ErrorText>
      {writable && (
        <Card title="Nouvelle caractéristique">
          <form onSubmit={add} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-4">
            <Field label="Nom"><Input name="name" required maxLength={100} /></Field>
            <Field label="Code"><Input name="code" required maxLength={50} pattern="[A-Za-z0-9_]+" placeholder="COULEUR" /></Field>
            <Field label="Type"><Select name="dataType">{Object.entries(TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
            <Button>Ajouter</Button>
          </form>
        </Card>
      )}
      <Card>
        <Table head={['Nom', 'Code', 'Type', '']}>
          {data?.map((c) => editing === c.id ? (
            <tr key={c.id}>
              <td><Input value={draft.name} maxLength={100} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></td>
              <td><Input value={draft.code} maxLength={50} onChange={(e) => setDraft({ ...draft, code: e.target.value })} /></td>
              <td><Select value={draft.dataType} onChange={(e) => setDraft({ ...draft, dataType: e.target.value })}>{Object.entries(TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></td>
              <td className="space-x-2 whitespace-nowrap text-right">
                <button className="text-xs underline" onClick={() => save(c.id)}>Enregistrer</button>
                <button className="text-xs underline" onClick={() => setEditing(undefined)}>Annuler</button>
              </td>
            </tr>
          ) : (
            <tr key={c.id}>
              <td>{c.name}</td><td className="font-mono text-xs">{c.code}</td><td><Badge>{TYPES[c.dataType]}</Badge></td>
              <td className="space-x-2 whitespace-nowrap text-right">{writable && <>
                <button className="text-xs underline" onClick={() => { setEditing(c.id); setDraft({ name: c.name, code: c.code, dataType: c.dataType }); setError(undefined); }}>Modifier</button>
                <button className="text-xs text-red-600 underline" onClick={() => del(c)}>Supprimer</button>
              </>}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
