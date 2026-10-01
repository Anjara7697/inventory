import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');

export function Button({ variant = 'primary', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  return (
    <button
      {...p}
      className={cx(
        'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-50',
        variant === 'primary' && 'bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300',
        variant === 'ghost' && 'border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-500',
        className,
      )}
    />
  );
}

const field = 'w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900';
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(field, p.className)} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx(field, p.className)} />;

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

export const Card = ({ title, children, className }: { title?: string; children: ReactNode; className?: string }) => (
  <section className={cx('rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900', className)}>
    {title && <h2 className="mb-3 text-sm font-semibold">{title}</h2>}
    {children}
  </section>
);

export const Badge = ({ tone = 'gray', children }: { tone?: 'gray' | 'green' | 'red' | 'amber'; children: ReactNode }) => (
  <span className={cx('rounded-full px-2 py-0.5 text-xs font-medium',
    tone === 'gray' && 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    tone === 'green' && 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    tone === 'red' && 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    tone === 'amber' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300')}>{children}</span>
);

export const Table = ({ head, children }: { head: string[]; children: ReactNode }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800">
        <tr>{head.map((h) => <th key={h} className="px-2 py-2 font-medium">{h}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 [&_td]:px-2 [&_td]:py-2">{children}</tbody>
    </table>
  </div>
);

export const ErrorText = ({ children }: { children?: ReactNode }) =>
  children ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{children}</p> : null;
