'use client';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Button, Card, ErrorText, Field, Input } from '@/components/ui';
import { api, saveSession } from '@/lib/api';

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
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto mt-24 max-w-sm px-4">
      <Card title="Connexion">
        <form onSubmit={submit} className="space-y-3">
          <Field label="Email"><Input name="email" type="email" required autoComplete="username" /></Field>
          <Field label="Mot de passe"><Input name="password" type="password" required autoComplete="current-password" /></Field>
          <ErrorText>{error}</ErrorText>
          <Button disabled={busy} className="w-full">Se connecter</Button>
        </form>
      </Card>
    </div>
  );
}
