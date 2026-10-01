'use client';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Button, Card, ErrorText, Field, Input, Select } from '@/components/ui';
import { api } from '@/lib/api';
import { useApi } from '@/lib/hooks';

interface Line { materialId: string; quantity: string; unitId: string }

export function ProductForm({ product }: { product?: any }) {
  const router = useRouter();
  const materials = useApi<any[]>('/materials');
  const units = useApi<any[]>('/units');
  const [lines, setLines] = useState<Line[]>(
    product?.materials.map((l: any) => ({ materialId: String(l.materialId), quantity: String(Number(l.quantity)), unitId: String(l.unitId) })) ?? [],
  );
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const materialById = (id: string) => materials.data?.find((m) => String(m.id) === id);
  const unitsFor = (materialId: string) => {
    const cat = materialById(materialId)?.unit.categoryId;
    return units.data?.filter((u) => u.categoryId === cat) ?? [];
  };
  const patch = (i: number, p: Partial<Line>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...p } : l)));

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      name: f.get('name'), sku: f.get('sku'), description: (f.get('description') as string) || undefined,
      active: f.get('active') === 'on',
      bom: lines.map((l) => ({ materialId: Number(l.materialId), quantity: Number(l.quantity), unitId: Number(l.unitId) })),
    };
    setBusy(true); setError(undefined);
    try {
      const saved = product
        ? await api(`/products/${product.id}`, { method: 'PATCH', body })
        : await api('/products', { method: 'POST', body });
      const min = f.get('minimumQuantity');
      if (min !== null && min !== '') await api(`/inventory/products/${saved.id}/threshold`, { method: 'PATCH', body: { minimumQuantity: Number(min) } });
      router.push(`/products/${saved.id}`);
    } catch (err) { setError((err as Error).message); setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card title="Informations">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nom"><Input name="name" required maxLength={150} defaultValue={product?.name} /></Field>
          <Field label="SKU"><Input name="sku" required maxLength={100} pattern="[A-Za-z0-9._\-]+" defaultValue={product?.sku} /></Field>
          <div className="sm:col-span-2"><Field label="Description"><Input name="description" defaultValue={product?.description ?? ''} /></Field></div>
          <Field label="Seuil minimum de stock (alerte, 0 = aucune)"><Input name="minimumQuantity" type="number" step="any" min="0" defaultValue={product?.stock ? Number(product.stock.minimumQuantity) : 0} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={product?.active ?? true} /> Actif</label>
        </div>
      </Card>

      <Card title="Nomenclature (matières nécessaires pour 1 produit)">
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_7rem_6rem_auto] items-end gap-2">
              <Field label={i === 0 ? 'Matière' : ''}>
                <Select value={l.materialId} required onChange={(e) => patch(i, { materialId: e.target.value, unitId: String(materialById(e.target.value)?.unitId ?? '') })}>
                  <option value="" disabled>Choisir…</option>
                  {materials.data?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
              </Field>
              <Field label={i === 0 ? 'Quantité' : ''}><Input type="number" step="any" min="0.00000001" required value={l.quantity} onChange={(e) => patch(i, { quantity: e.target.value })} /></Field>
              <Field label={i === 0 ? 'Unité' : ''}>
                <Select value={l.unitId} required onChange={(e) => patch(i, { unitId: e.target.value })}>
                  {unitsFor(l.materialId).map((u) => <option key={u.id} value={u.id}>{u.symbol}</option>)}
                </Select>
              </Field>
              <Button type="button" variant="ghost" onClick={() => setLines((ls) => ls.filter((_, k) => k !== i))} aria-label="Retirer">✕</Button>
            </div>
          ))}
          <Button type="button" variant="ghost" onClick={() => setLines((ls) => [...ls, { materialId: '', quantity: '', unitId: '' }])}>+ Ajouter une matière</Button>
        </div>
      </Card>

      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2">
        <Button disabled={busy}>{product ? 'Enregistrer' : 'Créer le produit'}</Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>Annuler</Button>
      </div>
    </form>
  );
}
