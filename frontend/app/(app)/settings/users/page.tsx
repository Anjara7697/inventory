'use client';
import { FormEvent, useState } from 'react';
import { IconPlus } from '@/components/icons';
import { ConfirmRow, RowActions } from '@/components/RowActions';
import { Badge, Button, Card, ErrorText, Field, Input, Loading, Select, Table } from '@/components/ui';
import { api, getUser } from '@/lib/api';
import { ROLE_HELP, ROLE_LABEL, initials } from '@/lib/format';
import { useApi } from '@/lib/hooks';

const ROLES = ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'];
const roleOptions = ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>);

export default function UsersSettings() {
  const { data, reload, loading, error: loadError } = useApi<any[]>('/users');
  const [error, setError] = useState<string>();
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<number>();
  const me = getUser();

  async function run(fn: () => Promise<unknown>) {
    setError(undefined);
    try { await fn(); setDeleting(undefined); reload(); return true; } catch (e) { setError((e as Error).message); return false; }
  }
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
    if (await run(() => api('/users', { method: 'POST', body: Object.fromEntries(f) }))) { form.reset(); setAdding(false); }
  }

  if (me?.role !== 'ADMIN') return <ErrorText>Réservé aux administrateurs.</ErrorText>;
  if (loading) return <Loading />;
  return (
    <>
      <div className="-mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-[13px] text-ink-muted">Qui a accès à l'application et ce que chacun peut faire.</p>
        {!adding && <Button onClick={() => { setAdding(true); setError(undefined); }}><IconPlus />Nouvel utilisateur</Button>}
      </div>
      <ErrorText>{error ?? loadError}</ErrorText>

      {adding && (
        <Card title="Nouvel utilisateur">
          <form onSubmit={add} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Prénom"><Input name="firstName" required /></Field>
            <Field label="Nom"><Input name="lastName" required /></Field>
            <Field label="Email"><Input name="email" type="email" required autoComplete="off" /></Field>
            <Field label="Mot de passe" hint="8 caractères minimum. À transmettre à la personne, qui pourra le changer dans son profil.">
              <Input name="password" type="password" minLength={8} required autoComplete="new-password" />
            </Field>
            <Field label="Rôle"><Select name="role" defaultValue="VIEWER">{roleOptions}</Select></Field>
            <span className="flex gap-2 self-end pb-5">
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>Annuler</Button>
              <Button>Créer l'utilisateur</Button>
            </span>
          </form>
        </Card>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card flush>
          <Table head={['Utilisateur', 'Rôle', '']}>
            {data?.map((u) => {
              const self = u.id === me.id;
              if (deleting === u.id) return (
                <ConfirmRow key={u.id} colSpan={3} onCancel={() => setDeleting(undefined)} onConfirm={() => run(() => api(`/users/${u.id}`, { method: 'DELETE' }))}>
                  Supprimer {u.firstName} {u.lastName} ({u.email}) ?
                </ConfirmRow>
              );
              return (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <span aria-hidden className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-ink">{initials(u)}</span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 font-medium">{u.firstName} {u.lastName}{self && <Badge tone="blue" plain>Vous</Badge>}</div>
                        <div className="truncate text-xs text-ink-muted">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="w-44">
                      <Select aria-label={`Rôle de ${u.firstName}`} value={u.role} disabled={self} title={self ? 'Vous ne pouvez pas changer votre propre rôle' : undefined}
                        onChange={(e) => run(() => api(`/users/${u.id}`, { method: 'PATCH', body: { role: e.target.value } }))}>
                        {roleOptions}
                      </Select>
                    </div>
                  </td>
                  <td>{!self && <RowActions name={`${u.firstName} ${u.lastName}`} onDelete={() => setDeleting(u.id)} />}</td>
                </tr>
              );
            })}
          </Table>
          <p className="px-4 pt-3 pb-1 text-xs text-ink-muted">Un utilisateur qui a déjà enregistré des mouvements ou des productions ne peut pas être supprimé : passez-le plutôt en Lecture seule.</p>
        </Card>

        <Card title="Que peut faire chaque rôle ?">
          <ul className="flex flex-col">
            {ROLE_HELP.map(([r, help]) => (
              <li key={r} className="border-b border-line py-2.5 last:border-b-0">
                <span className="block font-medium">{ROLE_LABEL[r]}</span>
                <span className="block text-[13px] text-ink-muted">{help}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
