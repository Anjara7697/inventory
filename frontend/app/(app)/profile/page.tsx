'use client';
import { FormEvent, useState } from 'react';
import { Badge, Button, Card, ErrorText, Field, Input, PageHeader } from '@/components/ui';
import { SessionUser, api, getUser, saveSession } from '@/lib/api';
import { ROLE_LABEL, initials } from '@/lib/format';

type Msg = { ok: boolean; text: string } | undefined;
const Message = ({ m }: { m: Msg }) =>
  !m ? null : m.ok ? <p role="status" className="rounded-lg bg-success-soft px-3 py-2 text-[13px] text-success">{m.text}</p> : <ErrorText>{m.text}</ErrorText>;

export default function Profile() {
  const [user, setUser] = useState<SessionUser | null>(() => getUser());
  const [profileMsg, setProfileMsg] = useState<Msg>();
  const [pwMsg, setPwMsg] = useState<Msg>();
  const [busy, setBusy] = useState<'profile' | 'password'>();

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy('profile'); setProfileMsg(undefined);
    try {
      const me = await api('/auth/me', { method: 'PATCH', body: { firstName: f.get('firstName'), lastName: f.get('lastName') } });
      localStorage.setItem('user', JSON.stringify(me));
      setUser(me);
      setProfileMsg({ ok: true, text: 'Profil enregistré.' });
    } catch (err) { setProfileMsg({ ok: false, text: (err as Error).message }); }
    finally { setBusy(undefined); }
  }

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setPwMsg(undefined);
    if (f.get('newPassword') !== f.get('confirm')) return setPwMsg({ ok: false, text: 'La confirmation ne correspond pas au nouveau mot de passe.' });
    setBusy('password');
    try {
      saveSession(await api('/auth/change-password', { method: 'POST', body: { currentPassword: f.get('currentPassword'), newPassword: f.get('newPassword') } }));
      form.reset();
      setPwMsg({ ok: true, text: 'Mot de passe modifié. Vos autres sessions ont été déconnectées.' });
    } catch (err) { setPwMsg({ ok: false, text: (err as Error).message }); }
    finally { setBusy(undefined); }
  }

  if (!user) return null;
  return (
    <>
      <PageHeader title="Mon profil" />
      <section className="flex items-center gap-4 rounded-[14px] border border-line bg-surface px-4 py-4 shadow-card sm:px-6">
        <span aria-hidden className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent-soft text-lg font-semibold text-accent-ink">{initials(user)}</span>
        <div className="min-w-0">
          <div className="text-lg font-semibold">{user.firstName} {user.lastName}</div>
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-muted"><span className="truncate">{user.email}</span><Badge tone="blue" plain>{ROLE_LABEL[user.role]}</Badge></div>
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card title="Informations">
          <form onSubmit={saveProfile} className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Prénom"><Input name="firstName" required defaultValue={user.firstName} /></Field>
              <Field label="Nom"><Input name="lastName" required defaultValue={user.lastName} /></Field>
            </div>
            <Field label="Email" hint="Seul un administrateur peut changer l'email ou le rôle.">
              <Input value={user.email} disabled readOnly />
            </Field>
            <Message m={profileMsg} />
            <Button className="self-start" disabled={busy === 'profile'}>Enregistrer</Button>
          </form>
        </Card>

        <Card title="Mot de passe">
          <form onSubmit={changePassword} className="flex flex-col gap-4">
            <Field label="Mot de passe actuel"><Input name="currentPassword" type="password" required autoComplete="current-password" /></Field>
            <Field label="Nouveau mot de passe" hint="8 caractères minimum."><Input name="newPassword" type="password" required minLength={8} autoComplete="new-password" /></Field>
            <Field label="Confirmer le nouveau mot de passe"><Input name="confirm" type="password" required minLength={8} autoComplete="new-password" /></Field>
            <Message m={pwMsg} />
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" disabled={busy === 'password'}>Changer le mot de passe</Button>
              <span className="text-xs text-ink-muted">Vos autres sessions seront déconnectées.</span>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
