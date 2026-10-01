'use client';
import { FormEvent, useState } from 'react';
import { canWrite } from '@/components/Shell';
import { Button, Card, ErrorText, Field, Input, Table } from '@/components/ui';
import { api, getUser } from '@/lib/api';
import { useApi } from '@/lib/hooks';

export default function SuppliersSettings() {
  const { data, reload } = useApi<any[]>('/suppliers');
  const [error, setError] = useState<string>();
  const writable = canWrite(getUser(), 'MANAGER');

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
    const body = Object.fromEntries([...f].filter(([, v]) => v !== ''));
    setError(undefined);
    try { await api('/suppliers', { method: 'POST', body }); form.reset(); reload(); } catch (err) { setError((err as Error).message); }
  }
  async function del(s: any) {
    if (!confirm(`Supprimer « ${s.name} » ? S'il a des commandes, il sera désactivé.`)) return;
    setError(undefined);
    try { await api(`/suppliers/${s.id}`, { method: 'DELETE' }); reload(); } catch (err) { setError((err as Error).message); }
  }

  return (
    <>
      <ErrorText>{error}</ErrorText>
      {writable && (
        <Card title="Nouveau fournisseur">
          <form onSubmit={add} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-5">
            <Field label="Nom"><Input name="name" required maxLength={150} /></Field>
            <Field label="Contact"><Input name="contact" maxLength={255} /></Field>
            <Field label="Email"><Input name="email" type="email" /></Field>
            <Field label="Téléphone"><Input name="phone" maxLength={50} /></Field>
            <Button>Ajouter</Button>
          </form>
        </Card>
      )}
      <Card>
        <Table head={['Nom', 'Contact', 'Email', 'Téléphone', '']}>
          {data?.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td><td>{s.contact}</td><td>{s.email}</td><td>{s.phone}</td>
              <td className="text-right">{writable && <button className="text-xs text-red-600 underline" onClick={() => del(s)}>Supprimer</button>}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
