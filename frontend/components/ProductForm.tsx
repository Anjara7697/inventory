'use client';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { IconClose, IconPlus } from './icons';
import { Button, Card, ErrorText, Field, Input, Select, Textarea, Toggle, cx } from './ui';
import { api, money } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { convert } from '@/lib/stock';

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
  const unitById = (id: string) => units.data?.find((u) => String(u.id) === id);
  const unitsFor = (materialId: string) => {
    const cat = materialById(materialId)?.unit.categoryId;
    return units.data?.filter((u) => u.categoryId === cat) ?? [];
  };
  const patch = (i: number, p: Partial<Line>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...p } : l)));

  /** Cost of one line for 1 product, or null while incomplete. */
  const lineCost = (l: Line) => {
    const m = materialById(l.materialId), u = unitById(l.unitId), q = Number(l.quantity);
    if (!m || !u || !q) return null;
    return convert(q, u, m.unit) * Number(m.unitCost ?? 0);
  };
  const total = lines.reduce((s, l) => s + (lineCost(l) ?? 0), 0);
  const used = new Set(lines.map((l) => l.materialId));

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
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card title="Informations">
          <div className="flex flex-col gap-4">
            <Field label="Nom"><Input name="name" required maxLength={150} defaultValue={product?.name} /></Field>
            <Field label="SKU" hint="Lettres, chiffres, point, tiret. Doit être unique.">
              <Input name="sku" required maxLength={100} pattern="[A-Za-z0-9._\-]+" defaultValue={product?.sku} className="font-mono text-[13px]" />
            </Field>
            <Field label="Description"><Textarea name="description" rows={3} defaultValue={product?.description ?? ''} /></Field>
            <Field label="Seuil d'alerte (pcs)" hint="Une alerte apparaît quand le stock passe sous ce seuil. 0 = aucune alerte.">
              <Input name="minimumQuantity" type="number" step="any" min="0" className="tabular-nums" defaultValue={product?.stock ? Number(product.stock.minimumQuantity) : 0} />
            </Field>
            <Toggle name="active" label="Actif" hint="Un produit inactif n'apparaît plus dans les listes." defaultChecked={product?.active ?? true} />
          </div>
        </Card>

        <Card title="Nomenclature" subtitle="Matières nécessaires pour fabriquer 1 pièce">
          <div className="flex flex-col gap-2.5">
            {lines.length > 0 && (
              <div className="grid grid-cols-[minmax(0,1fr)_88px_76px_36px] gap-2.5 text-[13px] font-medium sm:grid-cols-[minmax(0,1fr)_110px_90px_100px_36px]">
                <span>Matière</span><span>Quantité</span><span>Unité</span><span className="hidden text-right sm:block">Coût</span><span />
              </div>
            )}
            {lines.map((l, i) => {
              const cost = lineCost(l);
              return (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_88px_76px_36px] items-center gap-2.5 sm:grid-cols-[minmax(0,1fr)_110px_90px_100px_36px]">
                  <Select aria-label="Matière" value={l.materialId} required onChange={(e) => patch(i, { materialId: e.target.value, unitId: String(materialById(e.target.value)?.unitId ?? '') })}>
                    <option value="" disabled>Choisir…</option>
                    {materials.data?.map((m) => <option key={m.id} value={m.id} disabled={used.has(String(m.id)) && String(m.id) !== l.materialId}>{m.name}</option>)}
                  </Select>
                  <Input aria-label="Quantité" type="number" step="any" min="0.00000001" required value={l.quantity} className="text-right tabular-nums" onChange={(e) => patch(i, { quantity: e.target.value })} />
                  <Select aria-label="Unité" value={l.unitId} required onChange={(e) => patch(i, { unitId: e.target.value })}>
                    {unitsFor(l.materialId).map((u) => <option key={u.id} value={u.id}>{u.symbol}</option>)}
                  </Select>
                  <span className="hidden text-right text-ink-muted tabular-nums sm:block">{cost === null ? '—' : money(cost)}</span>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Retirer ${materialById(l.materialId)?.name ?? 'la ligne'}`}
                    onClick={() => setLines((ls) => ls.filter((_, k) => k !== i))}><IconClose size={16} /></Button>
                </div>
              );
            })}
            {lines.length === 0 && <p className="text-sm text-ink-muted">Aucune matière pour l'instant. Sans nomenclature, le produit ne peut pas être produit.</p>}
            <Button type="button" variant="ghost-accent" className="self-start"
              onClick={() => setLines((ls) => [...ls, { materialId: '', quantity: '', unitId: '' }])}><IconPlus />Ajouter une matière</Button>
          </div>
          <div className={cx('mt-4 flex justify-between border-t border-line pt-3.5', lines.length === 0 && 'hidden')}>
            <span className="text-ink-muted">Coût matière estimé</span>
            <span className="font-semibold tabular-nums">{money(total)} / pièce</span>
          </div>
        </Card>
      </div>

      <ErrorText>{error}</ErrorText>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Annuler</Button>
        <Button disabled={busy}>{product ? 'Enregistrer' : 'Créer le produit'}</Button>
      </div>
    </form>
  );
}
