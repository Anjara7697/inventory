'use client';
import { FormEvent, useState } from 'react';
import { IconPlus } from '@/components/icons';
import { ConfirmRow, RowActions } from '@/components/RowActions';
import { canWrite } from '@/components/Shell';
import { Badge, Button, Card, ErrorText, Field, Input, Loading, Select, Table } from '@/components/ui';
import { api, getUser } from '@/lib/api';
import { useApi } from '@/lib/hooks';

const TYPES: Record<string, string> = { STRING: 'Texte', NUMBER: 'Nombre', BOOLEAN: 'Oui / Non' };
const EMPTY = { name: '', code: '', dataType: 'STRING' };

export default function CharacteristicsSettings() {
  const { data, reload, loading, error: loadError } = useApi<any[]>('/characteristics');
  const [error, setError] = useState<string>();
  const writable = canWrite(getUser(), 'MANAGER');
  const [editing, setEditing] = useState<number | 'new'>();
  const [deleting, setDeleting] = useState<number>();
  const [draft, setDraft] = useState(EMPTY);

  async function run(fn: () => Promise<unknown>) {
    setError(undefined);
    try { await fn(); setEditing(undefined); setDeleting(undefined); reload(); } catch (err) { setError((err as Error).message); }
  }
  const body = () => ({ ...draft, code: draft.code.toUpperCase() });
  const add = (e: FormEvent) => { e.preventDefault(); run(() => api('/characteristics', { method: 'POST', body: body() })); };
  const typeSelect = (
    <Select aria-label="Type" value={draft.dataType} onChange={(e) => setDraft({ ...draft, dataType: e.target.value })}>
      {Object.entries(TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </Select>
  );

  if (loading) return <Loading />;
  return (
    <>
      <div className="-mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-[13px] text-ink-muted">Les caractéristiques décrivent les matières (couleur, composition, largeur…). Le type contrôle la saisie sur la fiche matière.</p>
        {writable && editing !== 'new' && <Button variant="secondary" onClick={() => { setEditing('new'); setDraft(EMPTY); setError(undefined); }}><IconPlus />Nouvelle caractéristique</Button>}
      </div>
      <ErrorText>{error ?? loadError}</ErrorText>

      {editing === 'new' && (
        <Card title="Nouvelle caractéristique">
          <form onSubmit={add} className="flex flex-wrap items-end gap-3">
            <div className="w-56"><Field label="Nom"><Input required maxLength={100} placeholder="Couleur" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field></div>
            <div className="w-44"><Field label="Code"><Input required maxLength={50} pattern="[A-Za-z0-9_]+" placeholder="COULEUR" className="font-mono text-[13px]" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} /></Field></div>
            <div className="w-40"><Field label="Type">{typeSelect}</Field></div>
            <Button type="button" variant="ghost" onClick={() => setEditing(undefined)}>Annuler</Button>
            <Button>Ajouter</Button>
          </form>
        </Card>
      )}

      <Card flush>
        <Table head={['Nom', 'Code', 'Type', '']}>
          {data?.map((c) => {
            if (deleting === c.id) return (
              <ConfirmRow key={c.id} colSpan={4} onCancel={() => setDeleting(undefined)} onConfirm={() => run(() => api(`/characteristics/${c.id}`, { method: 'DELETE' }))}>
                Supprimer « {c.name} » ? Impossible si une matière l'utilise encore.
              </ConfirmRow>
            );
            if (editing === c.id) return (
              <tr key={c.id}>
                <td><Input aria-label="Nom" value={draft.name} maxLength={100} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></td>
                <td><Input aria-label="Code" value={draft.code} maxLength={50} className="font-mono text-[13px]" onChange={(e) => setDraft({ ...draft, code: e.target.value })} /></td>
                <td><div className="w-40">{typeSelect}</div></td>
                <td className="text-right whitespace-nowrap">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(undefined)}>Annuler</Button>
                  <Button size="sm" onClick={() => run(() => api(`/characteristics/${c.id}`, { method: 'PATCH', body: body() }))}>Enregistrer</Button>
                </td>
              </tr>
            );
            return (
              <tr key={c.id}>
                <td className="font-medium">{c.name}</td>
                <td className="font-mono text-[12.5px] text-ink-muted">{c.code}</td>
                <td><Badge plain>{TYPES[c.dataType]}</Badge></td>
                <td>{writable && <RowActions name={c.name}
                  onEdit={() => { setEditing(c.id); setDeleting(undefined); setDraft({ name: c.name, code: c.code, dataType: c.dataType }); setError(undefined); }}
                  onDelete={() => { setDeleting(c.id); setEditing(undefined); }} />}</td>
              </tr>
            );
          })}
        </Table>
        {data?.length === 0 && <p className="px-4 py-3 text-sm text-ink-muted">Aucune caractéristique.</p>}
      </Card>
    </>
  );
}
