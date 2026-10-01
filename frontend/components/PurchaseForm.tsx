'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { IconClose, IconPlus } from './icons';
import { Button, Card, ErrorText, Field, Input, Select, Textarea } from './ui';
import { api, money } from '@/lib/api';
import { useApi } from '@/lib/hooks';

interface Line { materialId: string; quantity: string; unitId: string; unitPrice: string }

const COLS = 'grid grid-cols-[minmax(0,1fr)_84px_76px_36px] gap-2.5 sm:grid-cols-[minmax(0,1fr)_100px_80px_120px_96px_36px]';

/** `order` = existing DRAFT to edit. Otherwise lines can be pre-filled via ?lines=materialId:qty:unitId,… */
export function PurchaseForm({ order }: { order?: any }) {
  const router = useRouter();
  const params = useSearchParams();
  const suppliers = useApi<any[]>('/suppliers');
  const materials = useApi<any[]>('/materials');
  const units = useApi<any[]>('/units');
  const prefilled = !order && !!params.get('lines');
  const [supplierId, setSupplierId] = useState<string>(order ? String(order.supplierId) : '');
  const [lines, setLines] = useState<Line[]>(() => {
    if (order) return order.lines.map((l: any) => ({ materialId: String(l.materialId), quantity: String(Number(l.quantity)), unitId: String(l.unitId), unitPrice: l.unitPrice == null ? '' : String(Number(l.unitPrice)) }));
    const fromLink = (params.get('lines') ?? '').split(',').filter(Boolean).map((s) => {
      const [materialId, quantity, unitId] = s.split(':');
      return { materialId, quantity, unitId, unitPrice: '' };
    });
    return fromLink.length ? fromLink : [{ materialId: '', quantity: '', unitId: '', unitPrice: '' }];
  });
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const mat = (id: string) => materials.data?.find((m) => String(m.id) === id);
  const unitsFor = (materialId: string) => units.data?.filter((u) => u.categoryId === mat(materialId)?.unit.categoryId) ?? [];
  const symbol = (unitId: string) => units.data?.find((u) => String(u.id) === unitId)?.symbol ?? '';
  const patch = (i: number, p: Partial<Line>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...p } : l)));
  const amount = (l: Line) => (l.unitPrice === '' || l.quantity === '' ? null : Number(l.unitPrice) * Number(l.quantity));
  const total = lines.reduce((t, l) => t + (amount(l) ?? 0), 0);
  const supplier = suppliers.data?.find((s) => String(s.id) === supplierId);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      supplierId: Number(supplierId), notes: (f.get('notes') as string) || undefined,
      lines: lines.map((l) => ({ materialId: Number(l.materialId), quantity: Number(l.quantity), unitId: Number(l.unitId), unitPrice: l.unitPrice === '' ? undefined : Number(l.unitPrice) })),
    };
    setBusy(true); setError(undefined);
    try {
      const saved = order ? await api(`/purchase-orders/${order.id}`, { method: 'PATCH', body }) : await api('/purchase-orders', { method: 'POST', body });
      router.push(`/purchases/${saved.id}`);
    } catch (err) { setError((err as Error).message); setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {prefilled && (
        <p role="status" className="rounded-lg bg-accent-soft px-3 py-2.5 text-[13px] text-accent-ink">
          Commande pré-remplie avec les matières à racheter. Vérifiez les quantités, choisissez le fournisseur et ajoutez les prix si vous les connaissez.
        </p>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card title="Commande">
          <div className="flex flex-col gap-4">
            <Field label="Fournisseur" hint={supplier ? [supplier.contact, supplier.email, supplier.phone].filter(Boolean).join(' · ') || undefined : undefined}>
              <Select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="" disabled>Choisir…</option>
                {suppliers.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="Notes"><Textarea name="notes" rows={4} maxLength={500} defaultValue={order?.notes ?? ''} placeholder="Délai, conditionnement, conditions…" /></Field>
            <Link href="/settings/suppliers" className="text-[13px] font-medium text-accent hover:underline">Gérer les fournisseurs</Link>
          </div>
        </Card>

        <Card title="Matières à commander" subtitle="Le prix est optionnel ; s'il est renseigné, il met à jour le coût moyen à la réception.">
          <div className="flex flex-col gap-2.5">
            <div className={`${COLS} text-[13px] font-medium`}>
              <span>Matière</span><span>Quantité</span><span>Unité</span><span className="hidden sm:block">Prix / unité</span><span className="hidden text-right sm:block">Montant</span><span />
            </div>
            {lines.map((l, i) => {
              const a = amount(l);
              return (
                <div key={i} className={`${COLS} items-center`}>
                  <Select aria-label="Matière" value={l.materialId} required onChange={(e) => patch(i, { materialId: e.target.value, unitId: String(mat(e.target.value)?.unitId ?? '') })}>
                    <option value="" disabled>Choisir…</option>
                    {materials.data?.map((m) => <option key={m.id} value={m.id} disabled={lines.some((o, k) => k !== i && o.materialId === String(m.id))}>{m.name}</option>)}
                  </Select>
                  <Input aria-label="Quantité" type="number" step="any" min="0.00000001" required value={l.quantity} className="text-right tabular-nums" onChange={(e) => patch(i, { quantity: e.target.value })} />
                  <Select aria-label="Unité" value={l.unitId} required onChange={(e) => patch(i, { unitId: e.target.value })}>
                    {unitsFor(l.materialId).map((u) => <option key={u.id} value={u.id}>{u.symbol}</option>)}
                  </Select>
                  <div className="relative hidden sm:block">
                    <Input aria-label={`Prix par ${symbol(l.unitId) || 'unité'}`} type="number" step="any" min="0" value={l.unitPrice} className="pr-7 text-right tabular-nums" onChange={(e) => patch(i, { unitPrice: e.target.value })} />
                    <span className="pointer-events-none absolute top-2 right-2.5 text-ink-muted">€</span>
                  </div>
                  <span className="hidden text-right font-medium tabular-nums sm:block">{a === null ? '—' : money(a)}</span>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Retirer ${mat(l.materialId)?.name ?? 'la ligne'}`} onClick={() => setLines((ls) => ls.filter((_, k) => k !== i))}><IconClose size={16} /></Button>
                </div>
              );
            })}
            <Button type="button" variant="ghost-accent" className="self-start" onClick={() => setLines((ls) => [...ls, { materialId: '', quantity: '', unitId: '', unitPrice: '' }])}><IconPlus />Ajouter une matière</Button>
          </div>
          <div className="mt-4 flex justify-between border-t border-line pt-3.5">
            <span className="text-ink-muted">Total estimé</span>
            <span className="font-semibold tabular-nums">{money(total)}</span>
          </div>
        </Card>
      </div>

      <ErrorText>{error}</ErrorText>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Annuler</Button>
        <Button disabled={busy || lines.length === 0}>{order ? 'Enregistrer' : 'Créer le brouillon'}</Button>
      </div>
    </form>
  );
}
