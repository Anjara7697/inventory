'use client';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { LogoMark } from '@/components/Logo';
import { Button, ErrorText, Field, Input } from '@/components/ui';
import { ApiError, api, saveSession } from '@/lib/api';

/** Level of each "stock bin" in the brand panel (decorative, echoes the design system cover). */
const BINS = [0.7, 0.9, 0.3, 0.6, 1, 0.75, 0.85, 0.15, 0.55, 0.95, 0.4, 0.8];

const Brand = ({ inverse }: { inverse?: boolean }) => (
  <div className="flex items-center gap-2.5 text-base font-semibold">
    <LogoMark inverse={inverse} />Inventory
  </div>
);

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError(undefined);
    try {
      saveSession(await api('/auth/login', { method: 'POST', auth: false, body: { email: f.get('email'), password: f.get('password') } }));
      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'Email ou mot de passe incorrect.'
        : err instanceof TypeError ? 'Le serveur ne répond pas. Vérifiez votre connexion ou réessayez dans un instant.'
          : (err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <aside className="hidden flex-col justify-between gap-8 bg-accent p-12 text-on-accent md:flex">
        <Brand inverse />
        <div aria-hidden className="grid w-max grid-cols-4 gap-3.5">
          {BINS.map((level, i) => (
            <div key={i} className="relative h-16 w-16 overflow-hidden rounded-md bg-white/15">
              <span className={level > 0.45 ? 'absolute inset-x-0 bottom-0 bg-success' : level > 0.2 ? 'absolute inset-x-0 bottom-0 bg-warning' : 'absolute inset-x-0 bottom-0 bg-danger'}
                style={{ height: `${level * 100}%`, opacity: 0.9 }} />
            </div>
          ))}
        </div>
        <p className="max-w-md text-[30px] leading-9 font-semibold tracking-tight text-balance">Stock, matières et production d'un atelier, lisibles d'un coup d'œil.</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10">
        <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-5">
          <div className="md:hidden"><Brand /></div>
          <div>
            <h1 className="text-[26px] leading-8 font-semibold tracking-tight">Connexion</h1>
            <p className="mt-1 text-ink-muted">Accédez à la gestion de stock de l'atelier.</p>
          </div>
          <Field label="Email"><Input name="email" type="email" required autoComplete="username" autoFocus /></Field>
          <Field label="Mot de passe"><Input name="password" type="password" required autoComplete="current-password" /></Field>
          <ErrorText>{error}</ErrorText>
          <Button disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</Button>
          <p className="text-center text-[13px] text-ink-muted">Mot de passe oublié ? Demandez à un administrateur de le réinitialiser.</p>
        </form>
      </main>
    </div>
  );
}
