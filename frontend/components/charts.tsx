'use client';
import { useState } from 'react';

export interface Datum { label: string; value: number; heading?: string; tooltip?: string; detail?: string }

const nice = (max: number) => {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const n = max / pow;
  return ([1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((step) => n <= step) ?? 10) * pow;
};

/**
 * Vertical columns, one series (--series-1): ≤24px wide, 4px rounded data-end, square at the baseline,
 * hairline grid, value written on the last column only, hover tooltip on a full-height hit area.
 */
export function ColumnChart({ data, format = (v: number) => String(v), height = 240, label = 'Graphique en colonnes' }: {
  data: Datum[]; format?: (v: number) => string; height?: number; label?: string;
}) {
  const [hover, setHover] = useState<number>();
  const W = 720, padL = 40, padR = 8, padT = 22, padB = 28;
  const max = nice(Math.max(...data.map((d) => d.value), 0));
  const innerW = W - padL - padR, innerH = height - padT - padB;
  const slot = innerW / Math.max(data.length, 1);
  const bw = Math.min(18, slot * 0.55); // viewBox units: ~24px on screen at full width
  const y = (v: number) => padT + innerH - (v / max) * innerH;
  const ticks = [0, 0.5, 1].map((t) => t * max);
  const last = data.length - 1;
  return (
    // below ~560px the chart scrolls sideways instead of shrinking its text
    <div className="-mx-1 overflow-x-auto px-1"><div className="relative min-w-[560px]">
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label={label}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} style={{ stroke: 'var(--chart-grid)' }} strokeWidth={1} />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" style={{ fill: 'var(--chart-axis)' }} className="tabular-nums">{format(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = padL + slot * i + (slot - bw) / 2;
          const h = Math.max((d.value / max) * innerH, d.value > 0 ? 2 : 0);
          const base = padT + innerH;
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(undefined)}>
              <rect x={padL + slot * i} y={padT} width={slot} height={innerH + padB} fill="transparent" />
              {h > 0 && (
                <path d={`M${x},${base} V${base - h + Math.min(4, h)} a4,4 0 0 1 4,-4 h${bw - 8} a4,4 0 0 1 4,4 V${base} Z`}
                  style={{ fill: 'var(--series-1)' }} opacity={hover === undefined || hover === i ? 1 : 0.55} />
              )}
              {i === last && d.value > 0 && hover !== last && (
                <text x={x + bw / 2} y={base - h - 6} textAnchor="middle" fontSize="12" fontWeight={500} style={{ fill: 'var(--ink)' }} className="tabular-nums">{format(d.value)}</text>
              )}
              <text x={x + bw / 2} y={height - 8} textAnchor="middle" fontSize="11" style={{ fill: 'var(--chart-axis)' }}>{d.label}</text>
            </g>
          );
        })}
      </svg>
      {hover !== undefined && (
        <div role="tooltip" className="pointer-events-none absolute top-0 z-10 w-max max-w-64 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-pop"
          style={{ left: `${((padL + slot * hover + slot / 2) / W) * 100}%`, transform: `translateX(${hover > data.length * 0.7 ? '-100%' : hover < data.length * 0.3 ? '0' : '-50%'})` }}>
          <p className="font-semibold">{data[hover].heading ?? data[hover].label}</p>
          <p className="tabular-nums">{data[hover].tooltip ?? format(data[hover].value)}</p>
          {data[hover].detail && <p className="mt-0.5 text-ink-muted">{data[hover].detail}</p>}
        </div>
      )}
    </div></div>
  );
}

/** Ranked horizontal bars: name, bar from a common zero, value (+ optional note) at the end. */
export function BarList({ data, format = (v: number) => String(v), label = 'Classement' }: {
  data: (Datum & { note?: string; display?: string })[]; format?: (v: number) => string; label?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 0) || 1;
  return (
    <ul className="flex flex-col gap-3" aria-label={label}>
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[minmax(0,9.5rem)_1fr_auto] items-center gap-3 text-sm" title={d.tooltip}>
          <span className="truncate">{d.label}</span>
          <span className="h-2.5 rounded-r bg-sunken" aria-hidden>
            <span className="block h-2.5 rounded-r" style={{ width: `${Math.max((d.value / max) * 100, d.value > 0 ? 1.5 : 0)}%`, background: 'var(--series-1)' }} />
          </span>
          <span className="min-w-24 text-right whitespace-nowrap tabular-nums">
            {d.display ?? format(d.value)}{d.note && <span className="text-xs text-ink-muted"> · {d.note}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
