'use client';
import { FormEvent, useState } from 'react';
import { Button, Card, ErrorText, Field, Input } from '@/components/ui';
import { api, getUser, saveSession } from '@/lib/api';

export default function Profile() {
  const user = getUser();
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string }>();
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string }>();

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const me = await api('/auth/me', { method: 'PATCH', body: { firstName: f.get('firstName'), lastName: f.get('lastName') } });
      localStorage.setItem('user', JSON.stringify(me));
      setProfileMsg({ ok: true, text: 'Profil enregistré.' });
    } catch (err) { setProfileMsg({ ok: false, text: (err as Error).message }); }
  }

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    if (f.get('newPassword') !== f.get('confirm')) return setPwMsg({ ok: false, text: 'La confirmation ne correspond pas.' });
    try {
      saveSession(await api('/auth/change-password', { method: 'POST', body: { currentPassword: f.get('currentPassword'), newPassword: f.get('newPassword') } }));
      form.reset();
      setPwMsg({ ok: true, text: 'Mot de passe modifié. Vos autres sessions sont déconnectées.' });
    } catch (err) { setPwMsg({ ok: false, text: (err as Error).message }); }
  }

  if (!user) return null;
  const Msg = ({ m }: { m?: { ok: boolean; text: string } }) =>
    !m ? null : m.ok ? <p className="text-sm text-green-700">{m.text}</p> : <ErrorText>{m.text}</ErrorText>;

  return (
    <>
      <h1 className="text-xl font-semibold">Mon profil</h1>
      <Card title="Informations">
        <form onSubmit={saveProfile} className="grid gap-3 sm:grid-cols-2">
          <Field label="Prénom"><Input name="firstName" required defaultValue={user.firstName} /></Field>
          <Field label="Nom"><Input name="lastName" required defaultValue={user.lastName} /></Field>
          <Field label="Email"><Input value={user.email} disabled readOnly /></Field>
          <Field label="Rôle"><Input value={user.role} disabled readOnly /></Field>
          <div className="space-y-2 sm:col-span-2"><Button>Enregistrer</Button><Msg m={profileMsg} /></div>
        </form>
      </Card>
      <Card title="Changer le mot de passe">
        <form onSubmit={changePassword} className="grid max-w-sm gap-3">
          <Field label="Mot de passe actuel"><Input name="currentPassword" type="password" required autoComplete="current-password" /></Field>
          <Field label="Nouveau mot de passe (8 caractères min.)"><Input name="newPassword" type="password" required minLength={8} autoComplete="new-password" /></Field>
          <Field label="Confirmer"><Input name="confirm" type="password" required minLength={8} autoComplete="new-password" /></Field>
          <div className="space-y-2"><Button>Modifier le mot de passe</Button><Msg m={pwMsg} /></div>
        </form>
      </Card>
    </>
  );
}
