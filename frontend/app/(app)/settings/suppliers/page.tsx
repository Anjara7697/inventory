'use client';
import { FormEvent, useState } from 'react';
import { IconPlus } from '@/components/icons';
import { ConfirmRow, RowActions } from '@/components/RowActions';
import { canWrite } from '@/components/Shell';
import { Button, Card, ErrorText, Field, Input, Loading, Table } from '@/components/ui';
import { api, getUser } from '@/lib/api';
import { useApi } from '@/lib/hooks';

const EMPTY = { name: '', contact: '', email: '', phone: '' };
type Draft = typeof EMPTY;

export default function SuppliersSettings() {
  const { data, reload, loading, error: loadError } = useApi<any[]>('/suppliers');
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const writable = canWrite(getUser(), 'MANAGER');
  const [editing, setEditing] = useState<number | 'new'>();
  const [deleting, setDeleting] = useState<number>();
  const [draft, setDraft] = useState<Draft>(EMPTY);

  async function run(fn: () => Promise<any>, after?: (r: any) => void) {
    setError(undefined); setNotice(undefined);
    try { const r = await fn(); setEditing(undefined); setDeleting(undefined); after?.(r); reload(); } catch (err) { setError((err as Error).message); }
  }
  // empty optional fields are omitted (the API validates the email format)
  const body = () => Object.fromEntries(Object.entries(draft).filter(([k, v]) => k === 'name' || v !== ''));
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, [k]: e.target.value });
  const add = (e: FormEvent) => { e.preventDefault(); run(() => api('/suppliers', { method: 'POST', body: body() })); };

  if (loading) return <Loading />;
  return (
    <>
      <div className="-mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-[13px] text-ink-muted">Les fournisseurs apparaissent dans les commandes d'achat. Un fournisseur qui a déjà des commandes est désactivé au lieu d'être supprimé.</p>
        {writable && editing !== 'new' && <Button variant="secondary" onClick={() => { setEditing('new'); setDraft(EMPTY); setError(undefined); }}><IconPlus />Nouveau fournisseur</Button>}
      </div>
      <ErrorText>{error ?? loadError}</ErrorText>
      {notice && <p role="status" className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">{notice}</p>}

      {editing === 'new' && (
        <Card title="Nouveau fournisseur">
          <form onSubmit={add} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1.3fr_1fr_auto]">
            <Field label="Nom"><Input required maxLength={150} value={draft.name} onChange={set('name')} placeholder="Tissus Analamanga" /></Field>
            <Field label="Contact"><Input maxLength={255} value={draft.contact} onChange={set('contact')} placeholder="Service commercial" /></Field>
            <Field label="Email"><Input type="email" value={draft.email} onChange={set('email')} /></Field>
            <Field label="Téléphone"><Input maxLength={50} value={draft.phone} onChange={set('phone')} /></Field>
            <span className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(undefined)}>Annuler</Button>
              <Button>Ajouter</Button>
            </span>
          </form>
        </Card>
      )}

      <Card flush>
        <Table head={['Fournisseur', 'Contact', 'Email', 'Téléphone', '']}>
          {data?.map((s) => {
            if (deleting === s.id) return (
              <ConfirmRow key={s.id} colSpan={5} onCancel={() => setDeleting(undefined)}
                onConfirm={() => run(() => api(`/suppliers/${s.id}`, { method: 'DELETE' }), (r) => r?.deactivated && setNotice(`${s.name} a des commandes : il a été désactivé.`))}>
                Supprimer « {s.name} » ? S'il a des commandes, il sera seulement désactivé.
              </ConfirmRow>
            );
            if (editing === s.id) return (
              <tr key={s.id}>
                <td><Input aria-label="Nom" value={draft.name} maxLength={150} onChange={set('name')} /></td>
                <td><Input aria-label="Contact" value={draft.contact} maxLength={255} onChange={set('contact')} /></td>
                <td><Input aria-label="Email" type="email" value={draft.email} onChange={set('email')} /></td>
                <td><Input aria-label="Téléphone" value={draft.phone} maxLength={50} onChange={set('phone')} /></td>
                <td className="text-right whitespace-nowrap">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(undefined)}>Annuler</Button>
                  <Button size="sm" onClick={() => run(() => api(`/suppliers/${s.id}`, { method: 'PATCH', body: { ...draft, email: draft.email || undefined } }))}>Enregistrer</Button>
                </td>
              </tr>
            );
            return (
              <tr key={s.id}>
                <td className="font-medium">{s.name}</td>
                <td className="text-ink-muted">{s.contact || '—'}</td>
                <td className="select-all">{s.email || <span className="text-ink-muted">—</span>}</td>
                <td className="tabular-nums select-all">{s.phone || <span className="text-ink-muted">—</span>}</td>
                <td>{writable && <RowActions name={s.name}
                  onEdit={() => { setEditing(s.id); setDeleting(undefined); setDraft({ name: s.name, contact: s.contact ?? '', email: s.email ?? '', phone: s.phone ?? '' }); setError(undefined); }}
                  onDelete={() => { setDeleting(s.id); setEditing(undefined); }} />}</td>
              </tr>
            );
          })}
        </Table>
        {data?.length === 0 && <p className="px-4 py-3 text-sm text-ink-muted">Aucun fournisseur. Ajoutez-en un pour passer des commandes d'achat.</p>}
      </Card>
    </>
  );
}
