'use client';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { IconClose, IconPlus } from './icons';
import { Button, Card, ErrorText, Field, Input, Select, Textarea, Toggle } from './ui';
import { api } from '@/lib/api';
import { useApi } from '@/lib/hooks';

interface Row { characteristicId: string; value: string }

/** Number input with its unit shown inside, on the right ("€ / m", "m"). */
const WithSuffix = ({ suffix, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { suffix: string }) => (
  <div className="relative">
    <Input {...p} className="pr-16 text-right tabular-nums" />
    <span className="pointer-events-none absolute top-2 right-3 text-ink-muted">{suffix}</span>
  </div>
);

export function MaterialForm({ material }: { material?: any }) {
  const router = useRouter();
  const units = useApi<any[]>('/units');
  const defs = useApi<any[]>('/characteristics');
  const [unitId, setUnitId] = useState<string>(material ? String(material.unitId) : '');
  const [rows, setRows] = useState<Row[]>(
    material?.characteristics.map((c: any) => ({ characteristicId: String(c.characteristicId), value: c.value })) ?? [],
  );
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const patch = (i: number, p: Partial<Row>) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...p } : r)));
  const defOf = (id: string) => defs.data?.find((d) => String(d.id) === id);
  const optNum = (v: FormDataEntryValue | null) => (v === null || v === '' ? undefined : Number(v));
  const symbol = units.data?.find((u) => String(u.id) === unitId)?.symbol ?? '';

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      name: f.get('name'), sku: f.get('sku'), description: (f.get('description') as string) || undefined,
      unitId: Number(unitId), active: f.get('active') === 'on',
      unitCost: optNum(f.get('unitCost')), minimumQuantity: optNum(f.get('minimumQuantity')), maximumQuantity: optNum(f.get('maximumQuantity')),
      characteristics: rows.map((r) => ({ characteristicId: Number(r.characteristicId), value: r.value })),
    };
    setBusy(true); setError(undefined);
    try {
      const saved = material
        ? await api(`/materials/${material.id}`, { method: 'PATCH', body })
        : await api('/materials', { method: 'POST', body });
      router.push(`/materials/${saved.id}`);
    } catch (err) { setError((err as Error).message); setBusy(false); }
  }

  const stock = material?.stock;
  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card title="Informations">
          <div className="flex flex-col gap-4">
            <Field label="Nom"><Input name="name" required maxLength={150} defaultValue={material?.name} /></Field>
            <Field label="SKU" hint="Lettres, chiffres, point, tiret. Doit être unique.">
              <Input name="sku" required maxLength={100} pattern="[A-Za-z0-9._\-]+" defaultValue={material?.sku} className="font-mono text-[13px]" />
            </Field>
            <Field label="Unité de stock" hint="Le stock et le coût sont exprimés dans cette unité. Les nomenclatures peuvent utiliser une autre unité de la même catégorie (cm, mm…).">
              <Select name="unitId" required value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                <option value="" disabled>Choisir…</option>
                {units.data?.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.symbol}){u.category ? ` · ${u.category.name}` : ''}</option>)}
              </Select>
            </Field>
            <Field label="Description"><Textarea name="description" rows={2} defaultValue={material?.description ?? ''} /></Field>
            <Toggle name="active" label="Active" hint="Une matière inactive n'apparaît plus dans les listes." defaultChecked={material?.active ?? true} />
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-5">
          <Card title="Stock et coût">
            <div className="flex flex-col gap-4">
              <Field label="Coût unitaire" hint="Coût moyen, recalculé automatiquement à chaque réception de commande.">
                <WithSuffix suffix={symbol ? `€ / ${symbol}` : '€'} name="unitCost" type="number" step="any" min="0" defaultValue={material ? Number(material.unitCost) : 0} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Seuil minimum" hint="Alerte sous ce seuil.">
                  <WithSuffix suffix={symbol} name="minimumQuantity" type="number" step="any" min="0" defaultValue={stock ? Number(stock.minimumQuantity) : 0} />
                </Field>
                <Field label="Seuil maximum" hint="Optionnel. Sert à proposer la quantité à commander.">
                  <WithSuffix suffix={symbol} name="maximumQuantity" type="number" step="any" min="0" defaultValue={stock?.maximumQuantity ? Number(stock.maximumQuantity) : ''} />
                </Field>
              </div>
            </div>
          </Card>

          <Card title="Caractéristiques" subtitle="Définies dans Paramètres › Caractéristiques">
            <div className="flex flex-col gap-2.5">
              {rows.length > 0 && (
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_36px] gap-2.5 text-[13px] font-medium"><span>Caractéristique</span><span>Valeur</span><span /></div>
              )}
              {rows.map((r, i) => {
                const def = defOf(r.characteristicId);
                return (
                  <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_36px] items-center gap-2.5">
                    <Select aria-label="Caractéristique" value={r.characteristicId} required onChange={(e) => patch(i, { characteristicId: e.target.value, value: '' })}>
                      <option value="" disabled>Choisir…</option>
                      {defs.data?.map((d) => <option key={d.id} value={d.id} disabled={rows.some((o, k) => k !== i && o.characteristicId === String(d.id))}>{d.name}</option>)}
                    </Select>
                    {def?.dataType === 'BOOLEAN'
                      ? <Select aria-label="Valeur" value={r.value} required onChange={(e) => patch(i, { value: e.target.value })}><option value="" disabled>—</option><option value="true">Oui</option><option value="false">Non</option></Select>
                      : <Input aria-label="Valeur" required type={def?.dataType === 'NUMBER' ? 'number' : 'text'} step="any" maxLength={255} value={r.value} onChange={(e) => patch(i, { value: e.target.value })} />}
                    <Button type="button" variant="ghost" size="icon" aria-label={`Retirer ${def?.name ?? 'la ligne'}`} onClick={() => setRows((rs) => rs.filter((_, k) => k !== i))}><IconClose size={16} /></Button>
                  </div>
                );
              })}
              {rows.length === 0 && <p className="text-sm text-ink-muted">Aucune caractéristique (couleur, composition, largeur…).</p>}
              <Button type="button" variant="ghost-accent" className="self-start" onClick={() => setRows((rs) => [...rs, { characteristicId: '', value: '' }])}><IconPlus />Ajouter une caractéristique</Button>
            </div>
          </Card>
        </div>
      </div>

      <ErrorText>{error}</ErrorText>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Annuler</Button>
        <Button disabled={busy}>{material ? 'Enregistrer' : 'Créer la matière'}</Button>
      </div>
    </form>
  );
}
