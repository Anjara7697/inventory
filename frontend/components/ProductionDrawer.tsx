'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { IconClose, IconFactory } from './icons';
import { Badge, Button, ErrorText, Field, Input, Select, buttonClass, cx } from './ui';
import { api, num } from '@/lib/api';
import { purchaseLink } from '@/lib/stock';

const plural = (n: number) => `${num(n)} pièce${n > 1 ? 's' : ''}`;

/** Side panel to launch a production: pick a product, check materials, produce. */
export function ProductionDrawer({ open, productId, products, canOrder, onClose }: {
  open: boolean; productId?: number; products: any[]; canOrder: boolean; onClose: () => void;
}) {
  const router = useRouter();
  const [id, setId] = useState('');
  const [qty, setQty] = useState(10);
  const [capacity, setCapacity] = useState<any>();
  const [check, setCheck] = useState<any>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const firstField = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!open) return;
    setId(productId ? String(productId) : ''); setQty(10); setCheck(undefined); setError(undefined); setBusy(false);
    setTimeout(() => firstField.current?.focus(), 50);
  }, [open, productId]);

  useEffect(() => {
    setCapacity(undefined); setCheck(undefined);
    if (!id) return;
    api(`/products/${id}/production-capacity`).then(setCapacity).catch((e) => setCapacity({ error: (e as Error).message }));
  }, [id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const maxNow = capacity && !capacity.error ? Number(capacity.maximumProduction) : 0;

  async function runCheck(e?: FormEvent) {
    e?.preventDefault(); setError(undefined);
    try { setCheck(await api(`/products/${id}/check-production`, { method: 'POST', body: { quantity: qty } })); }
    catch (err) { setError((err as Error).message); }
  }

  async function produce(quantity: number) {
    setBusy(true); setError(undefined);
    try {
      const created = await api('/production', { method: 'POST', body: { productId: Number(id), quantity } });
      router.push(`/production/${created.id}`);
    } catch (err: any) {
      setError(err.body?.missing ? `Stock insuffisant : ${err.body.missing.map((m: any) => `il manque ${num(m.missing)} ${m.unit} de ${m.name}`).join(', ')}.` : err.message);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <button aria-label="Fermer" tabIndex={-1} className="absolute inset-0 bg-black/35" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-labelledby="production-title" className="absolute inset-y-0 right-0 flex w-[460px] max-w-full flex-col bg-surface shadow-pop">
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 id="production-title" className="text-lg font-semibold">Lancer une production</h2>
          <Button variant="ghost" size="icon" aria-label="Fermer" onClick={onClose}><IconClose /></Button>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
          <Field label="Produit" hint={capacity?.error ? <span className="text-warning">{capacity.error === 'Product has no bill of materials' ? 'Ce produit n\'a pas de nomenclature.' : capacity.error}</span>
            : capacity ? <>Réalisable maintenant : <strong className={cx('font-medium', maxNow === 0 && 'text-danger')}>{plural(maxNow)}</strong> · limité par {capacity.limitingMaterials.join(', ')}</> : undefined}>
            <Select ref={firstField} required value={id} onChange={(e) => setId(e.target.value)}>
              <option value="" disabled>Choisir…</option>
              {products.map((p) => <option key={p.id} value={p.id} disabled={!p.materials?.length}>{p.name} — {p.sku}{!p.materials?.length ? ' (sans nomenclature)' : ''}</option>)}
            </Select>
          </Field>

          <form onSubmit={runCheck} className="flex items-end gap-2">
            <div className="flex-1"><Field label="Quantité à produire">
              <div className="relative">
                <Input type="number" min={1} step={1} required value={qty} className="pr-12 text-right tabular-nums"
                  onChange={(e) => { setQty(Number(e.target.value)); setCheck(undefined); setError(undefined); }} />
                <span className="pointer-events-none absolute top-2 right-3 text-ink-muted">pcs</span>
              </div>
            </Field></div>
            <Button variant="secondary" disabled={!id || !!capacity?.error}>Vérifier</Button>
          </form>

          {check && (
            <>
              <ul className="flex flex-col">
                {check.materials.map((l: any) => (
                  <li key={l.materialId} className="flex items-center gap-3 border-b border-line py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{l.name}</div>
                      <div className="text-xs text-ink-muted">{num(l.required)} {l.unit} nécessaires · {num(l.available)} {l.unit} disponibles</div>
                    </div>
                    {l.sufficient ? <Badge tone="green">Suffisant</Badge> : <Badge tone="red">Manque {num(l.missing)} {l.unit}</Badge>}
                  </li>
                ))}
              </ul>
              {!check.feasible && (
                <>
                  <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2.5 text-[13px] leading-5 text-danger">
                    Stock insuffisant : {check.toBuy.map((b: any) => `il manque ${num(b.quantity)} ${b.unit} de ${b.name}`).join(', ')} pour {plural(qty)}.
                    {maxNow > 0 && ` Vous pouvez en produire ${num(maxNow)} maintenant.`}
                  </p>
                  {canOrder && <Link className={buttonClass('secondary')} href={purchaseLink(check.toBuy.map((b: any) => ({ materialId: b.materialId, quantity: Number(b.quantity), unitId: b.unitId })))}>Commander les matières manquantes</Link>}
                </>
              )}
            </>
          )}
          <ErrorText>{error}</ErrorText>
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
          <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
          {check?.feasible && <Button disabled={busy} onClick={() => produce(qty)}><IconFactory />Produire {plural(qty)}</Button>}
          {check && !check.feasible && maxNow > 0 && <Button disabled={busy} onClick={() => produce(maxNow)}><IconFactory />Produire {plural(maxNow)}</Button>}
          {!check && <Button disabled={!id || !!capacity?.error} onClick={() => runCheck()}>Vérifier les matières</Button>}
        </div>
      </aside>
    </div>
  );
}
