import Link from 'next/link';
import { ButtonHTMLAttributes, ComponentProps, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'ghost-accent' | 'ghost-danger';
type Size = 'md' | 'sm' | 'icon' | 'icon-sm' | 'icon-lg';
export const buttonClass = (variant: Variant = 'primary', size: Size = 'md') => cx(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
  size === 'md' && 'h-9 px-3.5 text-sm', size === 'sm' && 'h-8 px-2.5 text-[13px]',
  size === 'icon' && 'h-9 w-9 text-sm', size === 'icon-sm' && 'h-8 w-8 text-sm', size === 'icon-lg' && 'h-11 w-11 text-sm',
  variant === 'primary' && 'border-transparent bg-accent text-on-accent hover:brightness-110',
  variant === 'secondary' && 'border-line-strong bg-surface text-ink hover:bg-sunken',
  variant === 'ghost' && 'border-transparent bg-transparent text-ink-muted hover:bg-sunken hover:text-ink',
  variant === 'danger' && 'border-transparent bg-danger-soft text-danger hover:brightness-95',
  variant === 'ghost-accent' && 'border-transparent bg-transparent text-accent hover:bg-accent-soft',
  variant === 'ghost-danger' && 'border-transparent bg-transparent text-danger hover:bg-danger-soft',
);

/** Primary = the one main action of a screen; secondary for other actions; ghost for cancel/pager; danger for deletions. */
export function Button({ variant = 'primary', size = 'md', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button {...p} className={cx(buttonClass(variant, size), className)} />;
}

const field = 'h-[38px] w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-2 focus:outline-offset-1 focus:outline-accent aria-[invalid=true]:border-danger';
export const Input = (p: ComponentProps<'input'>) => <input {...p} className={cx(field, p.type === 'checkbox' && 'h-4 w-4', p.className)} />;
export const Select = (p: ComponentProps<'select'>) => <select {...p} className={cx(field, p.className)} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cx(field, 'h-auto py-2.5 leading-[22px]', p.className)} />;

/** Checkbox with a label and an optional explanation, laid out as a setting row. */
export const Toggle = ({ label, hint, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) => (
  <label className="flex items-center justify-between gap-3">
    <span><span className="block text-[13px] font-medium">{label}</span>{hint && <span className="block text-xs text-ink-muted">{hint}</span>}</span>
    <input type="checkbox" {...p} className="h-[18px] w-[18px] accent-accent" />
  </label>
);

/** "Produits / Pantalon Jean": every item but the last is a link. */
export const Breadcrumb = ({ items }: { items: [string, string?][] }) => (
  <nav aria-label="Fil d'Ariane" className="-mb-3 flex flex-wrap gap-1.5 text-[13px] text-ink-muted">
    {items.map(([label, href], i) => (
      <span key={i} className="flex gap-1.5">
        {i > 0 && <span aria-hidden>/</span>}
        {href ? <Link href={href} className="hover:text-accent">{label}</Link> : <span className="text-ink">{label}</span>}
      </span>
    ))}
  </nav>
);

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="grid content-start gap-1.5">
      <span className="text-[13px] font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

/** Surface card. `action` sits at the right of the title (a link such as "Voir tout"). */
export const Card = ({ title, subtitle, action, flush, children, className }: { title?: string; subtitle?: string; action?: ReactNode; flush?: boolean; children: ReactNode; className?: string }) => (
  <section className={cx('min-w-0 rounded-[14px] border border-line bg-surface shadow-card', flush ? 'p-3' : 'p-4 sm:p-6', className)}>
    {(title || action) && (
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {subtitle && <p className="text-[13px] text-ink-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    {children}
  </section>
);

/** Page title with optional overline (date, breadcrumb) and actions on the right. */
export const PageHeader = ({ title, overline, badge, meta, actions }: { title: string; overline?: ReactNode; badge?: ReactNode; meta?: ReactNode; actions?: ReactNode }) => (
  <header className="flex flex-wrap items-end justify-between gap-4">
    <div className="grid max-w-2xl gap-1.5">
      {overline && <span className="text-[13px] text-ink-muted">{overline}</span>}
      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="text-[26px] leading-8 font-semibold tracking-tight text-balance">{title}</h1>{badge}
      </div>
      {meta && <div className="flex flex-wrap items-center gap-2 text-ink-muted">{meta}</div>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </header>
);

/** KPI card: label in caps, figure, one line of context. Use 3–4 in a row. */
export const Stat = ({ label, value, unit, meta }: { label: string; value: ReactNode; unit?: string; meta?: ReactNode }) => (
  <div className="flex min-w-0 flex-col gap-2 rounded-[14px] border border-line bg-surface px-4 py-4 shadow-card sm:px-6 sm:py-5">
    <span className="text-xs font-medium tracking-wider text-ink-muted uppercase">{label}</span>
    <span className="text-2xl leading-8 font-medium tabular-nums sm:text-[30px] sm:leading-9">{value}{unit && <span className="ml-1.5 text-base text-ink-muted">{unit}</span>}</span>
    {meta && <span className="text-[13px] text-ink-muted">{meta}</span>}
  </div>
);

type Tone = 'gray' | 'green' | 'red' | 'amber' | 'blue';
/** State pill: the dot and color double a word, never replace it. `plain` drops the dot (category labels). */
export const Badge = ({ tone = 'gray', plain, children }: { tone?: Tone; plain?: boolean; children: ReactNode }) => (
  <span className={cx('inline-flex h-[22px] items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap',
    tone === 'gray' && 'bg-sunken text-ink-muted',
    tone === 'green' && 'bg-success-soft text-success',
    tone === 'red' && 'bg-danger-soft text-danger',
    tone === 'amber' && 'bg-warning-soft text-warning',
    tone === 'blue' && 'bg-accent-soft text-accent-ink')}>
    {!plain && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />}
    {children}
  </span>
);

/** Data table. Prefix a heading with ">" to right-align that column (numbers): ['Produit', '>Stock']. */
export const Table = ({ head, children }: { head: string[]; children: ReactNode }) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse text-left text-sm">
      <thead>
        <tr>{head.map((h, i) => {
          const right = h.startsWith('>');
          return <th key={`${h}-${i}`} className={cx('bg-sunken px-4 py-2.5 text-xs font-medium tracking-wider whitespace-nowrap text-ink-muted uppercase first:rounded-l-lg last:rounded-r-lg', right && 'text-right')}>{right ? h.slice(1) : h}</th>;
        })}</tr>
      </thead>
      <tbody className="[&_td]:border-b [&_td]:border-line [&_td]:px-4 [&_td]:py-3 [&_tr:hover_td]:bg-sunken [&_tr:last-child_td]:border-b-0">{children}</tbody>
    </table>
  </div>
);

/** Stock level bar; the vertical tick marks the minimum. Scale = maximum if set, else twice the minimum (or the quantity). */
export function StockGauge({ quantity, minimum, maximum, tone, className }: { quantity: number; minimum: number; maximum?: number | null; tone: 'green' | 'amber' | 'red'; className?: string }) {
  const scale = Math.max(Number(maximum) || minimum * 2 || quantity, quantity, 1);
  return (
    <div className={cx('relative h-1.5 rounded-full bg-sunken', className)} role="presentation">
      <span className={cx('absolute inset-y-0 left-0 rounded-full', tone === 'green' && 'bg-success', tone === 'amber' && 'bg-warning', tone === 'red' && 'bg-danger')}
        style={{ width: `${Math.min(100, (quantity / scale) * 100)}%` }} />
      {minimum > 0 && <span className="absolute -top-[3px] h-3 w-0.5 rounded-sm bg-ink-muted" style={{ left: `${(minimum / scale) * 100}%` }} />}
    </div>
  );
}

export const Sku = ({ children }: { children: ReactNode }) => <span className="font-mono text-[12.5px] whitespace-nowrap text-ink-muted">{children}</span>;

export const ErrorText = ({ children }: { children?: ReactNode }) =>
  children ? <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{children}</p> : null;

export const Loading = () => <p className="text-sm text-ink-muted">Chargement…</p>;

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  if (total <= pageSize) return total ? <p className="mt-3 text-[13px] text-ink-muted">{total} résultat{total > 1 ? 's' : ''}</p> : <p className="mt-3 text-[13px] text-ink-muted">Aucun résultat.</p>;
  const last = Math.ceil(total / pageSize) - 1;
  return (
    <div className="mt-4 flex items-center justify-between text-[13px] text-ink-muted">
      <span className="tabular-nums">{page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} sur {total}</span>
      <span className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => onPage(page - 1)}>Précédent</Button>
        <Button variant="secondary" size="sm" disabled={page >= last} onClick={() => onPage(page + 1)}>Suivant</Button>
      </span>
    </div>
  );
}
