'use client';
import { useState } from 'react';
import { BarList, ColumnChart } from '@/components/charts';
import { Card, ErrorText, Field, Input, Select, Table } from '@/components/ui';
import { money, num } from '@/lib/api';
import { useApi } from '@/lib/hooks';

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const monthLabel = (k: string) => `${MONTHS[Number(k.slice(5)) - 1]} ${k.slice(2, 4)}`;

const Tile = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <Card><p className="text-xs text-zinc-500">{label}</p><p className="text-2xl font-semibold tabular-nums">{value}</p>{sub && <p className="text-xs text-zinc-500">{sub}</p>}</Card>
);

const Data = ({ children }: { children: React.ReactNode }) => (
  <details className="mt-3 text-sm"><summary className="cursor-pointer text-xs text-zinc-500 underline">Voir les données</summary><div className="mt-2">{children}</div></details>
);

export default function Reports() {
  const [months, setMonths] = useState('12');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const range = new URLSearchParams();
  if (from) range.set('from', new Date(from).toISOString());
  if (to) range.set('to', new Date(`${to}T23:59:59.999`).toISOString());
  const qs = range.toString() ? `?${range}` : '';

  const value = useApi<any>('/reports/stock-value');
  const monthly = useApi<any[]>(`/reports/production-monthly?months=${months}`);
  const topM = useApi<any[]>(`/reports/top-materials${qs}`);
  const topP = useApi<any[]>(`/reports/top-products${qs}`);
  const err = value.error ?? monthly.error ?? topM.error ?? topP.error;

  return (
    <>
      <h1 className="text-xl font-semibold">Rapports</h1>
      <ErrorText>{err}</ErrorText>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Valeur du stock</h2>
        {value.data && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Tile label="Matières premières" value={money(value.data.totals.materials)} sub="quantité × coût moyen" />
              <Tile label="Produits finis" value={money(value.data.totals.products)} sub="estimation au coût actuel des matières" />
              <Tile label="Total" value={money(value.data.totals.total)} />
            </div>
            <Card>
              <details>
                <summary className="cursor-pointer text-xs text-zinc-500 underline">Détail par élément</summary>
                <div className="mt-2 grid gap-4 lg:grid-cols-2">
                  <Table head={['Matière', 'Quantité', 'Coût unit.', 'Valeur']}>
                    {value.data.materials.map((r: any) => <tr key={r.id}><td>{r.name}</td><td>{num(r.quantity)} {r.unit}</td><td>{money(r.unitCost)}</td><td>{money(r.value)}</td></tr>)}
                  </Table>
                  <Table head={['Produit', 'Quantité', 'Coût unit.', 'Valeur']}>
                    {value.data.products.map((r: any) => <tr key={r.id}><td>{r.name}</td><td>{num(r.quantity)}</td><td>{r.hasBom ? money(r.unitCost) : '—'}</td><td>{money(r.value)}</td></tr>)}
                  </Table>
                </div>
                <p className="mt-2 text-xs text-zinc-500">Le coût d'une matière est la moyenne pondérée de ses réceptions de commandes avec prix ; il est aussi modifiable à la main sur la fiche matière.</p>
              </details>
            </Card>
          </>
        )}
      </section>

      <Card title="Production mensuelle (pièces fabriquées)">
        <div className="mb-3 w-40"><Field label="Période"><Select value={months} onChange={(e) => setMonths(e.target.value)}>
          <option value="6">6 mois</option><option value="12">12 mois</option><option value="24">24 mois</option></Select></Field></div>
        {monthly.data && (
          <>
            <ColumnChart
              data={monthly.data.map((m) => ({
                label: monthLabel(m.month), value: Number(m.quantity),
                tooltip: `${num(m.quantity)} pièces · ${m.runs} production${m.runs > 1 ? 's' : ''}${m.products.length ? ' — ' + m.products.map((p: any) => `${p.name} ${num(p.quantity)}`).join(', ') : ''}`,
              }))}
              format={(v) => num(v, 0)}
            />
            <Data>
              <Table head={['Mois', 'Pièces', 'Productions', 'Détail']}>
                {monthly.data.map((m) => <tr key={m.month}><td>{monthLabel(m.month)}</td><td>{num(m.quantity)}</td><td>{m.runs}</td><td>{m.products.map((p: any) => `${p.name} ${num(p.quantity)}`).join(', ')}</td></tr>)}
              </Table>
            </Data>
          </>
        )}
      </Card>

      <Card title="Période des classements">
        <div className="flex flex-wrap gap-3">
          <Field label="Du"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="Au"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Matières les plus consommées">
          {topM.data && (topM.data.length === 0 ? <p className="text-sm text-zinc-500">Aucune consommation sur la période.</p> : (
            <>
              <BarList data={topM.data.map((r) => ({ label: r.name, value: Number(r.consumed), tooltip: `Perdu : ${num(r.lost)} ${r.unit} · Coût : ${money(r.cost)}` }))} format={(v) => num(v)} />
              <Data>
                <Table head={['Matière', 'Consommé', 'Perdu', 'Coût consommé']}>
                  {topM.data.map((r) => <tr key={r.materialId}><td>{r.name}</td><td>{num(r.consumed)} {r.unit}</td><td>{num(r.lost)} {r.unit}</td><td>{money(r.cost)}</td></tr>)}
                </Table>
              </Data>
            </>
          ))}
        </Card>
        <Card title="Produits les plus fabriqués">
          {topP.data && (topP.data.length === 0 ? <p className="text-sm text-zinc-500">Aucune production sur la période.</p> : (
            <>
              <BarList data={topP.data.map((r) => ({ label: r.name, value: Number(r.quantity), tooltip: `${r.runs} production(s)` }))} format={(v) => num(v, 0)} />
              <Data>
                <Table head={['Produit', 'Pièces', 'Productions']}>
                  {topP.data.map((r) => <tr key={r.productId}><td>{r.name}</td><td>{num(r.quantity)}</td><td>{r.runs}</td></tr>)}
                </Table>
              </Data>
            </>
          ))}
        </Card>
      </div>
    </>
  );
}
