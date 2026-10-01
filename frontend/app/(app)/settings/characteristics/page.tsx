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
          {data?.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td><td className="font-mono text-xs">{c.code}</td><td><Badge>{TYPES[c.dataType]}</Badge></td>
              <td className="text-right">{writable && <button className="text-xs text-red-600 underline" onClick={() => del(c)}>Supprimer</button>}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
