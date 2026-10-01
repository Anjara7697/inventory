'use client';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { IconClose } from './icons';
import { Button, ErrorText, Field, Input, Select, cx } from './ui';
import { api, num } from '@/lib/api';

export type Kind = 'material' | 'product';
export type MoveType = 'ENTRY' | 'EXIT' | 'LOSS' | 'RETURN' | 'ADJUSTMENT';
export interface DrawerInit { kind?: Kind; itemId?: number; type?: MoveType }

const TYPES: { type: MoveType; label: string; sign: string; hint: Record<Kind, string>; verb: string; done: string }[] = [
  { type: 'ENTRY', label: 'Entrée', sign: '+', verb: "l'entrée", done: 'Entrée enregistrée', hint: { material: 'Réception, stock initial', product: 'Stock initial, fabrication externe' } },
  { type: 'EXIT', label: 'Sortie', sign: '−', verb: 'la sortie', done: 'Sortie enregistrée', hint: { material: 'Usage hors production', product: 'Vente, expédition' } },
  { type: 'LOSS', label: 'Perte', sign: '−', verb: 'la perte', done: 'Perte enregistrée', hint: { material: 'Chute, casse, vol', product: 'Casse, défaut, vol' } },
  { type: 'RETURN', label: 'Retour', sign: '+', verb: 'le retour', done: 'Retour enregistré', hint: { material: 'Retour depuis l\'atelier', product: 'Retour client' } },
  { type: 'ADJUSTMENT', label: 'Ajustement', sign: '±', verb: "l'ajustement", done: 'Ajustement enregistré', hint: { material: 'Correction après inventaire', product: 'Correction après inventaire' } },
];

/**
 * Side panel to record a manual stock movement.
 * `materials` / `products` are the rows of GET /inventory (stock + item).
 */
export function MovementDrawer({ open, init, materials, products, canAdjust, onClose, onDone }: {
  open: boolean; init: DrawerInit; materials: any[]; products: any[]; canAdjust: boolean;
  onClose: () => void; onDone: (message: string) => void;
}) {
  const [kind, setKind] = useState<Kind>('material');
  const [type, setType] = useState<MoveType>('ENTRY');
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const firstField = useRef<HTMLSelectElement>(null);

  // Reset to the requested start state each time the panel opens.
  useEffect(() => {
    if (!open) return;
    setKind(init.kind ?? 'material'); setType(init.type ?? 'ENTRY');
    setItemId(init.itemId ? String(init.itemId) : ''); setQuantity(''); setError(undefined); setBusy(false);
    setTimeout(() => firstField.current?.focus(), 50);
  }, [open, init]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const rows = kind === 'material' ? materials : products;
  const row = rows.find((r) => String(kind === 'material' ? r.materialId : r.productId) === itemId);
  const unit = kind === 'material' ? row?.material.unit.symbol ?? '' : 'pcs';
  const name = kind === 'material' ? row?.material.name : row?.product.name;
  const current = row ? Number(row.quantity) : undefined;
  const q = Number(quantity);
  const delta = !quantity || Number.isNaN(q) ? undefined
    : type === 'ADJUSTMENT' ? q : type === 'EXIT' || type === 'LOSS' ? -Math.abs(q) : Math.abs(q);
  const after = current !== undefined && delta !== undefined ? current + delta : undefined;
  const def = TYPES.find((t) => t.type === type)!;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError(undefined);
    try {
      await api('/stock-movements', { method: 'POST', body: {
        type, [kind === 'material' ? 'materialId' : 'productId']: Number(itemId), quantity: q,
        reason: (f.get('reason') as string) || undefined, reference: (f.get('reference') as string) || undefined,
      } });
      onDone(`${def.done} : ${delta! > 0 ? '+' : '−'}${num(Math.abs(delta!))} ${unit} de ${name}.`);
    } catch (err) { setError((err as Error).message); setBusy(false); }
  }

  const segment = (on: boolean) => cx('h-[34px] rounded-lg px-2 text-[13px] font-medium transition-colors', on ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink');

  return (
    <div className="fixed inset-0 z-50">
      <button aria-label="Fermer" tabIndex={-1} className="absolute inset-0 bg-black/35" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-labelledby="movement-title"
        className="absolute inset-y-0 right-0 flex w-[460px] max-w-full flex-col bg-surface shadow-pop">
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 id="movement-title" className="text-lg font-semibold">Nouveau mouvement</h2>
          <Button variant="ghost" size="icon" aria-label="Fermer" onClick={onClose}><IconClose /></Button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
            <div role="radiogroup" aria-label="Élément" className="grid grid-cols-2 gap-1 rounded-[10px] bg-sunken p-[3px]">
              {(['material', 'product'] as Kind[]).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={kind === k} className={segment(kind === k)}
                  onClick={() => { setKind(k); setItemId(''); }}>{k === 'material' ? 'Matière première' : 'Produit fini'}</button>
              ))}
            </div>

            <fieldset className="grid gap-2">
              <legend className="mb-2 text-[13px] font-medium">Type de mouvement</legend>
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map((t) => {
                  const disabled = t.type === 'ADJUSTMENT' && !canAdjust;
                  const on = type === t.type;
                  return (
                    <label key={t.type} className={cx('relative flex cursor-pointer flex-col gap-0.5 rounded-[10px] border px-3 py-2.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent',
                      on ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:bg-sunken', disabled && 'cursor-not-allowed opacity-50')}>
                      <input type="radio" name="type" value={t.type} checked={on} disabled={disabled} onChange={() => setType(t.type)} className="sr-only" />
                      <span className={cx('flex justify-between font-medium', on && 'text-accent-ink')}>{t.label}<span className="tabular-nums">{t.sign}</span></span>
                      <span className="text-xs text-ink-muted">{disabled ? 'Réservé aux responsables' : t.hint[kind]}</span>
                    </label>
                  );
                })}
              </div>
              <span className="text-xs text-ink-muted">Les productions sont enregistrées depuis la fiche produit.</span>
            </fieldset>

            <Field label={kind === 'material' ? 'Matière' : 'Produit'} hint={row ? `Stock actuel : ${num(row.quantity)} ${unit}` : undefined}>
              <Select ref={firstField} required value={itemId} onChange={(e) => setItemId(e.target.value)}>
                <option value="" disabled>Choisir…</option>
                {rows.map((r) => {
                  const id = kind === 'material' ? r.materialId : r.productId;
                  const it = kind === 'material' ? r.material : r.product;
                  return <option key={id} value={id}>{it.name} — {it.sku}</option>;
                })}
              </Select>
            </Field>

            <Field label="Quantité" hint={type === 'ADJUSTMENT' ? 'Positive pour ajouter, négative pour retirer.' : undefined}>
              <div className="relative">
                <Input type="number" step="any" required min={type === 'ADJUSTMENT' ? undefined : '0.00000001'} value={quantity}
                  onChange={(e) => setQuantity(e.target.value)} className="pr-14 text-right tabular-nums" />
                <span className="pointer-events-none absolute top-2 right-3 text-ink-muted">{unit}</span>
              </div>
            </Field>

            {after !== undefined && (
              <div className={cx('flex items-center justify-between gap-3 rounded-[10px] px-3.5 py-3', after < 0 ? 'bg-danger-soft text-danger' : 'bg-sunken')}>
                <span className={after < 0 ? '' : 'text-ink-muted'}>{after < 0 ? 'Stock insuffisant' : 'Stock après le mouvement'}</span>
                <span className="font-medium tabular-nums">{num(current!)} {unit} <span className="text-ink-muted">→</span> {num(after)} {unit}</span>
              </div>
            )}

            <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-3">
              <Field label="Motif"><Input name="reason" maxLength={255} placeholder={def.hint[kind]} /></Field>
              <Field label="Référence"><Input name="reference" maxLength={100} placeholder="BL-0041" className="font-mono text-[13px]" /></Field>
            </div>
            <ErrorText>{error}</ErrorText>
          </div>

          <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
            <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
            <Button disabled={busy || (after !== undefined && after < 0)}>Enregistrer {def.verb}</Button>
          </div>
        </form>
      </aside>
    </div>
  );
}
