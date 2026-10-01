'use client';
import { useState } from 'react';

export interface Datum { label: string; value: number; tooltip?: string }

const nice = (max: number) => {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const n = max / pow;
  return ([1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((step) => n <= step) ?? 10) * pow;
};

/** Vertical bar chart: one series, thin bars with a rounded data end anchored to the baseline. */
export function ColumnChart({ data, format = (v: number) => String(v), height = 220 }: { data: Datum[]; format?: (v: number) => string; height?: number }) {
  const [hover, setHover] = useState<number>();
  const W = 640, padL = 36, padR = 8, padT = 12, padB = 28;
  const max = nice(Math.max(...data.map((d) => d.value), 0));
  const innerW = W - padL - padR, innerH = height - padT - padB;
  const slot = innerW / Math.max(data.length, 1);
  const bw = Math.min(28, slot * 0.6);
  const y = (v: number) => padT + innerH - (v / max) * innerH;
  const ticks = [0, 0.5, 1].map((t) => t * max);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label="Graphique en barres">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} style={{ stroke: 'var(--chart-grid)' }} strokeWidth={1} />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize="10" style={{ fill: 'var(--chart-axis)' }}>{format(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = padL + slot * i + (slot - bw) / 2;
          const h = Math.max((d.value / max) * innerH, d.value > 0 ? 2 : 0);
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(undefined)}>
              <rect x={padL + slot * i} y={padT} width={slot} height={innerH} fill="transparent" />
              {h > 0 && <path d={`M${x},${padT + innerH} V${padT + innerH - h + 4} a4,4 0 0 1 4,-4 h${bw - 8} a4,4 0 0 1 4,4 V${padT + innerH} Z`} style={{ fill: 'var(--series-1)' }} opacity={hover === undefined || hover === i ? 1 : 0.55} />}
              <text x={x + bw / 2} y={height - 10} textAnchor="middle" fontSize="10" style={{ fill: 'var(--chart-axis)' }}>{d.label}</text>
            </g>
          );
        })}
      </svg>
      {hover !== undefined && (
        <div className="pointer-events-none absolute top-0 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs shadow dark:border-zinc-700 dark:bg-zinc-900"
          style={{ left: `${((padL + slot * hover + slot / 2) / W) * 100}%`, transform: 'translateX(-50%)' }}>
          <p className="font-medium">{data[hover].label}</p>
          <p>{data[hover].tooltip ?? format(data[hover].value)}</p>
        </div>
      )}
    </div>
  );
}

/** Horizontal bars with the value written at the end of each bar (ranked lists). */
export function BarList({ data, format = (v: number) => String(v) }: { data: Datum[]; format?: (v: number) => string }) {
  const max = Math.max(...data.map((d) => d.value), 0) || 1;
  return (
    <ul className="space-y-2" role="img" aria-label="Classement">
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[minmax(6rem,12rem)_1fr_auto] items-center gap-2 text-sm" title={d.tooltip}>
          <span className="truncate">{d.label}</span>
          <span className="h-3 rounded-full bg-zinc-100 dark:bg-zinc-800">
            <span className="block h-3 rounded-full" style={{ width: `${Math.max((d.value / max) * 100, d.value > 0 ? 2 : 0)}%`, background: 'var(--series-1)' }} />
          </span>
          <span className="tabular-nums text-zinc-600 dark:text-zinc-400">{format(d.value)}</span>
        </li>
      ))}
    </ul>
  );
}
