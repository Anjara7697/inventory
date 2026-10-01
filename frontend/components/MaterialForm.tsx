'use client';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Button, Card, ErrorText, Field, Input, Select } from '@/components/ui';
import { api } from '@/lib/api';
import { useApi } from '@/lib/hooks';

interface Row { characteristicId: string; value: string }

export function MaterialForm({ material }: { material?: any }) {
  const router = useRouter();
  const units = useApi<any[]>('/units');
  const defs = useApi<any[]>('/characteristics');
  const [rows, setRows] = useState<Row[]>(
    material?.characteristics.map((c: any) => ({ characteristicId: String(c.characteristicId), value: c.value })) ?? [],
  );
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const patch = (i: number, p: Partial<Row>) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...p } : r)));
  const defOf = (id: string) => defs.data?.find((d) => String(d.id) === id);
  const optNum = (v: FormDataEntryValue | null) => (v === null || v === '' ? undefined : Number(v));

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      name: f.get('name'), sku: f.get('sku'), description: (f.get('description') as string) || undefined,
      unitId: Number(f.get('unitId')), active: f.get('active') === 'on',
      minimumQuantity: optNum(f.get('minimumQuantity')), maximumQuantity: optNum(f.get('maximumQuantity')),
      characteristics: rows.map((r) => ({ characteristicId: Number(r.characteristicId), value: r.value })),
    };
    setBusy(true); setError(undefined);
    try {
      if (material) await api(`/materials/${material.id}`, { method: 'PATCH', body });
      else await api('/materials', { method: 'POST', body });
      router.push('/materials');
    } catch (err) { setError((err as Error).message); setBusy(false); }
  }

  async function remove() {
    if (!confirm('Supprimer cette matière ? Si elle est utilisée, elle sera seulement désactivée.')) return;
    try { await api(`/materials/${material.id}`, { method: 'DELETE' }); router.push('/materials'); }
    catch (err) { setError((err as Error).message); }
  }

  const stock = material?.stock;
  return (
    <form onSubmit={submit} className="space-y-4">
      <Card title="Informations">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nom"><Input name="name" required maxLength={150} defaultValue={material?.name} /></Field>
          <Field label="SKU"><Input name="sku" required maxLength={100} pattern="[A-Za-z0-9._\-]+" defaultValue={material?.sku} /></Field>
          <Field label="Unité de stock">
            <Select name="unitId" required defaultValue={material?.unitId ?? ''}>
              <option value="" disabled>Choisir…</option>
              {units.data?.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
            </Select>
          </Field>
          <Field label="Description"><Input name="description" defaultValue={material?.description ?? ''} /></Field>
          <Field label="Seuil minimum (alerte)"><Input name="minimumQuantity" type="number" step="any" min="0" defaultValue={stock ? Number(stock.minimumQuantity) : 0} /></Field>
          <Field label="Seuil maximum"><Input name="maximumQuantity" type="number" step="any" min="0" defaultValue={stock?.maximumQuantity ? Number(stock.maximumQuantity) : ''} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={material?.active ?? true} /> Active</label>
        </div>
      </Card>

      <Card title="Caractéristiques">
        <div className="space-y-2">
          {rows.map((r, i) => {
            const def = defOf(r.characteristicId);
            return (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <Select value={r.characteristicId} required onChange={(e) => patch(i, { characteristicId: e.target.value, value: '' })}>
                  <option value="" disabled>Choisir…</option>
                  {defs.data?.map((d) => <option key={d.id} value={d.id} disabled={rows.some((o, k) => k !== i && o.characteristicId === String(d.id))}>{d.name}</option>)}
                </Select>
                {def?.dataType === 'BOOLEAN'
                  ? <Select value={r.value} required onChange={(e) => patch(i, { value: e.target.value })}><option value="" disabled>—</option><option value="true">Oui</option><option value="false">Non</option></Select>
                  : <Input required type={def?.dataType === 'NUMBER' ? 'number' : 'text'} step="any" maxLength={255} value={r.value} onChange={(e) => patch(i, { value: e.target.value })} />}
                <Button type="button" variant="ghost" onClick={() => setRows((rs) => rs.filter((_, k) => k !== i))} aria-label="Retirer">✕</Button>
              </div>
            );
          })}
          <Button type="button" variant="ghost" onClick={() => setRows((rs) => [...rs, { characteristicId: '', value: '' }])}>+ Ajouter une caractéristique</Button>
        </div>
      </Card>

      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2">
        <Button disabled={busy}>{material ? 'Enregistrer' : 'Créer la matière'}</Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>Annuler</Button>
        {material && <Button type="button" variant="danger" className="ml-auto" onClick={remove}>Supprimer</Button>}
      </div>
    </form>
  );
}
