'use client';
import { FormEvent, useState } from 'react';
import { Button, Card, ErrorText, Field, Input, Select, Table } from '@/components/ui';
import { api, getUser } from '@/lib/api';
import { useApi } from '@/lib/hooks';

const ROLES = ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'];

export default function UsersSettings() {
  const { data, reload, error: loadError } = useApi<any[]>('/users');
  const [error, setError] = useState<string>();
  const me = getUser();

  async function run(fn: () => Promise<unknown>) {
    setError(undefined);
    try { await fn(); reload(); } catch (e) { setError((e as Error).message); }
  }
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
    await run(async () => {
      await api('/users', { method: 'POST', body: Object.fromEntries(f) });
      form.reset();
    });
  }

  if (me?.role !== 'ADMIN') return <ErrorText>Réservé aux administrateurs.</ErrorText>;
  return (
    <>
      <ErrorText>{error ?? loadError}</ErrorText>
      <Card title="Nouvel utilisateur">
        <form onSubmit={add} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-3">
          <Field label="Prénom"><Input name="firstName" required /></Field>
          <Field label="Nom"><Input name="lastName" required /></Field>
          <Field label="Email"><Input name="email" type="email" required /></Field>
          <Field label="Mot de passe (8 caractères min.)"><Input name="password" type="password" minLength={8} required autoComplete="new-password" /></Field>
          <Field label="Rôle"><Select name="role" defaultValue="VIEWER">{ROLES.map((r) => <option key={r}>{r}</option>)}</Select></Field>
          <Button>Créer</Button>
        </form>
      </Card>
      <Card>
        <Table head={['Nom', 'Email', 'Rôle', '']}>
          {data?.map((u) => (
            <tr key={u.id}>
              <td>{u.firstName} {u.lastName}</td><td>{u.email}</td>
              <td><Select value={u.role} disabled={u.id === me.id} className="w-36"
                onChange={(e) => run(() => api(`/users/${u.id}`, { method: 'PATCH', body: { role: e.target.value } }))}>
                {ROLES.map((r) => <option key={r}>{r}</option>)}</Select></td>
              <td className="text-right">{u.id !== me.id && (
                <button className="text-xs text-red-600 underline" onClick={() => confirm(`Supprimer ${u.email} ?`) && run(() => api(`/users/${u.id}`, { method: 'DELETE' }))}>Supprimer</button>)}</td>
            </tr>
          ))}
        </Table>
        <p className="mt-2 text-xs text-zinc-500">Un utilisateur ayant déjà enregistré des mouvements ou des productions ne peut pas être supprimé.</p>
      </Card>
    </>
  );
}
