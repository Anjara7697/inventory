'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Button, Card, ErrorText, Field, Input, Select } from '@/components/ui';
import { api } from '@/lib/api';
import { useApi } from '@/lib/hooks';

interface Line { materialId: string; quantity: string; unitId: string }

/** `order` = existing DRAFT to edit. Otherwise lines can be pre-filled via ?lines=materialId:qty:unitId,… */
export function PurchaseForm({ order }: { order?: any }) {
  const router = useRouter();
  const params = useSearchParams();
  const suppliers = useApi<any[]>('/suppliers');
  const materials = useApi<any[]>('/materials');
  const units = useApi<any[]>('/units');
  const [lines, setLines] = useState<Line[]>(() => {
    if (order) return order.lines.map((l: any) => ({ materialId: String(l.materialId), quantity: String(Number(l.quantity)), unitId: String(l.unitId) }));
    return (params.get('lines') ?? '').split(',').filter(Boolean).map((s) => {
      const [materialId, quantity, unitId] = s.split(':');
      return { materialId, quantity, unitId };
    });
  });
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const mat = (id: string) => materials.data?.find((m) => String(m.id) === id);
  const unitsFor = (materialId: string) => units.data?.filter((u) => u.categoryId === mat(materialId)?.unit.categoryId) ?? [];
  const patch = (i: number, p: Partial<Line>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...p } : l)));

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      supplierId: Number(f.get('supplierId')), notes: (f.get('notes') as string) || undefined,
      lines: lines.map((l) => ({ materialId: Number(l.materialId), quantity: Number(l.quantity), unitId: Number(l.unitId) })),
    };
    setBusy(true); setError(undefined);
    try {
      const saved = order ? await api(`/purchase-orders/${order.id}`, { method: 'PATCH', body }) : await api('/purchase-orders', { method: 'POST', body });
      router.push(`/purchases/${saved.id}`);
    } catch (err) { setError((err as Error).message); setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card title="Commande">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Fournisseur">
            <Select name="supplierId" required defaultValue={order?.supplierId ?? ''}>
              <option value="" disabled>Choisir…</option>
              {suppliers.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Notes"><Input name="notes" maxLength={500} defaultValue={order?.notes ?? ''} /></Field>
        </div>
      </Card>
      <Card title="Matières à commander">
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_7rem_6rem_auto] items-end gap-2">
              <Select value={l.materialId} required onChange={(e) => patch(i, { materialId: e.target.value, unitId: String(mat(e.target.value)?.unitId ?? '') })}>
                <option value="" disabled>Choisir…</option>
                {materials.data?.map((m) => <option key={m.id} value={m.id} disabled={lines.some((o, k) => k !== i && o.materialId === String(m.id))}>{m.name}</option>)}
              </Select>
              <Input type="number" step="any" min="0.00000001" required value={l.quantity} onChange={(e) => patch(i, { quantity: e.target.value })} />
              <Select value={l.unitId} required onChange={(e) => patch(i, { unitId: e.target.value })}>
                {unitsFor(l.materialId).map((u) => <option key={u.id} value={u.id}>{u.symbol}</option>)}
              </Select>
              <Button type="button" variant="ghost" onClick={() => setLines((ls) => ls.filter((_, k) => k !== i))} aria-label="Retirer">✕</Button>
            </div>
          ))}
          <Button type="button" variant="ghost" onClick={() => setLines((ls) => [...ls, { materialId: '', quantity: '', unitId: '' }])}>+ Ajouter une matière</Button>
        </div>
      </Card>
      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2">
        <Button disabled={busy || lines.length === 0}>{order ? 'Enregistrer' : 'Créer le brouillon'}</Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>Annuler</Button>
      </div>
    </form>
  );
}
