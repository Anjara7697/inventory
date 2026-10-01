'use client';
import { ReactNode, useMemo, useState } from 'react';
import { BarList, ColumnChart } from '@/components/charts';
import { Button, Card, ErrorText, Input, Loading, PageHeader, Stat, Table, cx } from '@/components/ui';
import { money, num } from '@/lib/api';
import { useApi } from '@/lib/hooks';

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MONTHS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
/** "2026-09" → "sept." (or "sept. 26" for January and the first column, so the year is readable). */
const monthLabel = (k: string, withYear = false) => `${MONTHS[Number(k.slice(5)) - 1]}${withYear ? ` ${k.slice(2, 4)}` : ''}`;
const monthLong = (k: string) => `${MONTHS_LONG[Number(k.slice(5)) - 1]} ${k.slice(0, 4)}`;

type Preset = '30' | '90' | 'year' | 'all' | 'custom';
const PRESETS: [Preset, string][] = [['30', '30 jours'], ['90', '90 jours'], ['year', 'Cette année'], ['all', 'Tout']];
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Collapsible table under a chart: the same numbers, readable without the chart. */
function DataView({ label = 'Voir les données', children }: { label?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4">
      <button className="text-[13px] font-medium text-accent hover:underline" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Masquer les données' : label}</button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

/** CSV for Excel FR: ";" separator, decimal comma, UTF-8 BOM. */
function downloadCsv(name: string, sections: [string, string[], (string | number)[][]][]) {
  const cell = (v: string | number) => {
    const s = typeof v === 'number' ? String(v).replace('.', ',') : v;
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines: string[] = [];
  for (const [title, head, rows] of sections) {
    lines.push(cell(title), head.map(cell).join(';'), ...rows.map((r) => r.map(cell).join(';')), '');
  }
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function Reports() {
  const [months, setMonths] = useState('12');
  const [preset, setPreset] = useState<Preset>('90');
  const [from, setFrom] = useState(() => isoDay(new Date(Date.now() - 90 * 86_400_000)));
  const [to, setTo] = useState(() => isoDay(new Date()));

  const pick = (p: Preset) => {
    setPreset(p);
    const now = new Date();
    if (p === '30' || p === '90') { setFrom(isoDay(new Date(Date.now() - Number(p) * 86_400_000))); setTo(isoDay(now)); }
    if (p === 'year') { setFrom(`${now.getFullYear()}-01-01`); setTo(isoDay(now)); }
    if (p === 'all') { setFrom(''); setTo(''); }
  };
  const qs = useMemo(() => {
    const range = new URLSearchParams();
    if (from) range.set('from', new Date(from).toISOString());
    if (to) range.set('to', new Date(`${to}T23:59:59.999`).toISOString());
    return range.toString() ? `?${range}` : '';
  }, [from, to]);

  const value = useApi<any>('/reports/stock-value');
  const monthly = useApi<any[]>(`/reports/production-monthly?months=${months}`);
  const topM = useApi<any[]>(`/reports/top-materials${qs}`);
  const topP = useApi<any[]>(`/reports/top-products${qs}`);
  const err = value.error ?? monthly.error ?? topM.error ?? topP.error;

  const m = monthly.data ?? [];
  const totalPieces = m.reduce((s, r) => s + Number(r.quantity), 0);
  const best = m.reduce<any>((b, r) => (!b || Number(r.quantity) > Number(b.quantity) ? r : b), undefined);
  const segment = (on: boolean) => cx('h-8 rounded-lg px-3 text-[13px] font-medium transition-colors', on ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink');
  const periodLabel = preset === 'all' ? 'depuis le début' : `du ${from ? new Date(from).toLocaleDateString('fr-FR') : '…'} au ${to ? new Date(to).toLocaleDateString('fr-FR') : '…'}`;

  function exportCsv() {
    const v = value.data;
    downloadCsv(`rapport-inventory-${isoDay(new Date())}.csv`, [
      ['Valeur du stock — matières', ['Matière', 'Quantité', 'Unité', 'Coût unitaire (€)', 'Valeur (€)'],
        (v?.materials ?? []).map((r: any) => [r.name, Number(r.quantity), r.unit, Number(r.unitCost), Number(r.value)])],
      ['Valeur du stock — produits finis', ['Produit', 'Quantité (pcs)', 'Coût matière unitaire (€)', 'Valeur (€)'],
        (v?.products ?? []).map((r: any) => [r.name, Number(r.quantity), r.hasBom ? Number(r.unitCost) : '', Number(r.value)])],
      [`Production mensuelle (${months} mois)`, ['Mois', 'Pièces', 'Productions', 'Détail'],
        m.map((r) => [r.month, Number(r.quantity), r.runs, r.products.map((p: any) => `${p.name} ${Number(p.quantity)}`).join(', ')])],
      [`Matières les plus consommées (${periodLabel})`, ['Matière', 'Consommé', 'Perdu', 'Unité', 'Coût consommé (€)'],
        (topM.data ?? []).map((r) => [r.name, Number(r.consumed), Number(r.lost), r.unit, Number(r.cost)])],
      [`Produits les plus fabriqués (${periodLabel})`, ['Produit', 'Pièces', 'Productions'],
        (topP.data ?? []).map((r) => [r.name, Number(r.quantity), r.runs])],
    ]);
  }

  return (
    <>
      <PageHeader
        title="Rapports"
        overline="Production, consommation et valeur du stock · données en temps réel"
        actions={<Button variant="secondary" disabled={!value.data || !monthly.data} onClick={exportCsv}>Exporter en CSV</Button>}
      />
      <ErrorText>{err}</ErrorText>

      <h2 className="-mb-2 text-base font-semibold">Valeur du stock</h2>
      {!value.data ? <Loading /> : (
        <>
          <section className="grid gap-5 sm:grid-cols-3">
            <Stat label="Matières premières" value={money(value.data.totals.materials)} meta="Quantité × coût moyen" />
            <Stat label="Produits finis" value={money(value.data.totals.products)} meta="Estimation au coût actuel des matières" />
            <Stat label="Total" value={money(value.data.totals.total)} meta={`Au ${new Date().toLocaleDateString('fr-FR', { dateStyle: 'long' })}`} />
          </section>
          <div className="grid items-start gap-5 lg:grid-cols-2">
            <Card title="Valeur par matière" subtitle="Où est immobilisé l'argent du stock">
              <BarList label="Valeur par matière" format={money}
                data={[...value.data.materials].sort((a, b) => Number(b.value) - Number(a.value)).map((r: any) => ({ label: r.name, value: Number(r.value), tooltip: `${num(r.quantity)} ${r.unit} × ${money(r.unitCost)}` }))} />
              <DataView label="Voir le tableau">
                <Table head={['Matière', '>Quantité', '>Coût unit.', '>Valeur']}>
                  {value.data.materials.map((r: any) => <tr key={r.id}><td>{r.name}</td><td className="text-right tabular-nums">{num(r.quantity)} {r.unit}</td><td className="text-right tabular-nums">{money(r.unitCost)}</td><td className="text-right tabular-nums">{money(r.value)}</td></tr>)}
                </Table>
                <p className="mt-2 text-xs text-ink-muted">Le coût d'une matière est la moyenne pondérée de ses réceptions avec prix ; il est aussi modifiable sur la fiche matière.</p>
              </DataView>
            </Card>
            <Card title="Valeur par produit fini" subtitle="Stock × coût matière par pièce">
              <BarList label="Valeur par produit fini" format={money}
                data={[...value.data.products].sort((a, b) => Number(b.value) - Number(a.value)).map((r: any) => ({ label: r.name, value: Number(r.value), note: r.hasBom ? undefined : 'sans nomenclature', tooltip: `${num(r.quantity)} pcs × ${r.hasBom ? money(r.unitCost) : '—'}` }))} />
              <DataView label="Voir le tableau">
                <Table head={['Produit', '>Quantité', '>Coût unit.', '>Valeur']}>
                  {value.data.products.map((r: any) => <tr key={r.id}><td>{r.name}</td><td className="text-right tabular-nums">{num(r.quantity)} pcs</td><td className="text-right tabular-nums">{r.hasBom ? money(r.unitCost) : '—'}</td><td className="text-right tabular-nums">{money(r.value)}</td></tr>)}
                </Table>
              </DataView>
            </Card>
          </div>
        </>
      )}

      <Card>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Production mensuelle</h2>
            <p className="text-[13px] text-ink-muted">Pièces fabriquées par mois, productions annulées exclues</p>
          </div>
          <div role="group" aria-label="Période" className="flex gap-1 rounded-[10px] bg-sunken p-[3px]">
            {['6', '12', '24'].map((v) => <button key={v} aria-pressed={months === v} className={segment(months === v)} onClick={() => setMonths(v)}>{v} mois</button>)}
          </div>
        </div>
        {!monthly.data ? <Loading /> : (
          <>
            <div className="mb-4 flex flex-wrap gap-8">
              <div><span className="text-xs font-medium tracking-wider text-ink-muted uppercase">Sur {months} mois</span><div className="text-[22px] font-medium tabular-nums">{num(totalPieces)} pièces</div></div>
              <div><span className="text-xs font-medium tracking-wider text-ink-muted uppercase">Moyenne</span><div className="text-[22px] font-medium tabular-nums">{num(totalPieces / Number(months), 0)} / mois</div></div>
              {best && Number(best.quantity) > 0 && (
                <div><span className="text-xs font-medium tracking-wider text-ink-muted uppercase">Meilleur mois</span><div className="text-[22px] font-medium tabular-nums">{monthLabel(best.month)} · {num(best.quantity)}</div></div>
              )}
            </div>
            <ColumnChart
              label="Pièces fabriquées par mois"
              data={m.map((r, i) => ({
                label: monthLabel(r.month, i === 0 || r.month.endsWith('-01')), value: Number(r.quantity),
                heading: monthLong(r.month), tooltip: `${num(r.quantity)} pièce${Number(r.quantity) > 1 ? 's' : ''} · ${r.runs} production${r.runs > 1 ? 's' : ''}`,
                detail: r.products.map((p: any) => `${p.name} ${num(p.quantity)}`).join(', ') || undefined,
              }))}
              format={(v) => num(v, 0)}
            />
            <DataView>
              <Table head={['Mois', '>Pièces', '>Productions', 'Détail']}>
                {m.map((r) => <tr key={r.month}><td>{monthLong(r.month)}</td><td className="text-right tabular-nums">{num(r.quantity)}</td><td className="text-right tabular-nums">{r.runs}</td><td className="text-[13px] text-ink-muted">{r.products.map((p: any) => `${p.name} ${num(p.quantity)}`).join(', ')}</td></tr>)}
              </Table>
            </DataView>
          </>
        )}
      </Card>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Classements</h2>
          <p className="text-[13px] text-ink-muted">Période : {periodLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Période des classements" className="flex flex-wrap gap-1 rounded-[10px] bg-sunken p-[3px]">
            {PRESETS.map(([p, l]) => <button key={p} aria-pressed={preset === p} className={segment(preset === p)} onClick={() => pick(p)}>{l}</button>)}
          </div>
          <span className="text-xs text-ink-muted">ou</span>
          <div className="w-40"><Input type="date" aria-label="Du" value={from} onChange={(e) => { setFrom(e.target.value); setPreset('custom'); }} /></div>
          <span className="text-ink-muted" aria-hidden>→</span>
          <div className="w-40"><Input type="date" aria-label="Au" value={to} onChange={(e) => { setTo(e.target.value); setPreset('custom'); }} /></div>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card title="Matières les plus consommées" subtitle="Par la production ; les pertes sont indiquées à part">
          {!topM.data ? <Loading /> : topM.data.length === 0 ? <p className="text-sm text-ink-muted">Aucune consommation sur la période.</p> : (
            <>
              <BarList label="Matières les plus consommées"
                data={topM.data.map((r) => ({ label: r.name, value: Number(r.consumed), display: `${num(r.consumed)} ${r.unit}`, note: Number(r.lost) > 0 ? `perdu ${num(r.lost)} ${r.unit}` : undefined, tooltip: `Coût consommé : ${money(r.cost)}` }))} />
              <DataView>
                <Table head={['Matière', '>Consommé', '>Perdu', '>Coût consommé']}>
                  {topM.data.map((r) => <tr key={r.materialId}><td>{r.name}</td><td className="text-right tabular-nums">{num(r.consumed)} {r.unit}</td><td className="text-right tabular-nums">{num(r.lost)} {r.unit}</td><td className="text-right tabular-nums">{money(r.cost)}</td></tr>)}
                </Table>
              </DataView>
            </>
          )}
        </Card>
        <Card title="Produits les plus fabriqués" subtitle="Pièces et nombre de productions">
          {!topP.data ? <Loading /> : topP.data.length === 0 ? <p className="text-sm text-ink-muted">Aucune production sur la période.</p> : (
            <>
              <BarList label="Produits les plus fabriqués" format={(v) => `${num(v, 0)} pcs`}
                data={topP.data.map((r) => ({ label: r.name, value: Number(r.quantity), note: `${r.runs} prod.` }))} />
              <DataView>
                <Table head={['Produit', '>Pièces', '>Productions']}>
                  {topP.data.map((r) => <tr key={r.productId}><td>{r.name}</td><td className="text-right tabular-nums">{num(r.quantity)}</td><td className="text-right tabular-nums">{r.runs}</td></tr>)}
                </Table>
              </DataView>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
