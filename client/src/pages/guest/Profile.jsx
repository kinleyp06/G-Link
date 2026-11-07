// Edit profile: the same fields as the sign-up form (shared ProfileFields), plus changing the password.
// The RUB member switch decides the rate the guest pays (RUB or Non-RUB).
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Field, Notice, useAction } from '../../components/ui.jsx';
import ProfileFields, { profileFromUser } from '../../components/ProfileFields.jsx';

export default function Profile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [pw, setPw] = useState({ current_password: '', new_password: '' });
  const save = useAction();
  const pwAction = useAction();

  useEffect(() => {
    if (user) setForm(profileFromUser(user));
  }, [user]);

  if (!form) return null;
  const firstTime = !user.profile_complete;

  const submit = async (e) => {
    e.preventDefault();
    const res = await save.run(() => api.put('/profile', form));
    if (res) {
      setUser(res.user);
      if (firstTime && res.user.role === 'Guest') navigate('/rooms');
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    const res = await pwAction.run(() => api.put('/profile/password', pw));
    if (res) setPw({ current_password: '', new_password: '' });
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Your profile</h1>
          <p>{user.email} {user.email_verified ? '(confirmed)' : ''}{user.role === 'Guest' && <> | Your rate: <strong className="highlight">{user.is_rub_member ? 'RUB' : 'Non-RUB'}</strong></>}</p>
        </div>
      </div>
      {firstTime && <Notice type="info">Complete your profile before your first booking.</Notice>}
      <form className="panel stack" onSubmit={submit}>
        <Notice type={save.msg.type}>{save.msg.text}</Notice>
        <ProfileFields form={form} setForm={setForm} />
        <div><button className="btn" disabled={save.busy}>Save profile</button></div>
      </form>

      <h2>Change password</h2>
      <form className="panel stack" onSubmit={changePassword}>
        <Notice type={pwAction.msg.type}>{pwAction.msg.text}</Notice>
        <div className="form-grid">
          <Field label="Current password"><input type="password" required value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} /></Field>
          <Field label="New password"><input type="password" required minLength={8} value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} /></Field>
        </div>
        <div><button className="btn secondary" disabled={pwAction.busy}>Change password</button></div>
      </form>
    </>
  );
}
