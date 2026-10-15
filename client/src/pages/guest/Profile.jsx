// Edit profile. Name, CID, gender, contact and department must be filled before the first booking.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Field, Notice, useAction } from '../../components/ui.jsx';

export default function Profile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [pw, setPw] = useState({ current_password: '', new_password: '' });
  const save = useAction();
  const pwAction = useAction();

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || '', last_name: user.last_name || '', phone_number: user.phone_number || '',
        citizenship_id: user.citizenship_id || '', gender: user.gender || '', sid: user.sid || '', department: user.department || '',
      });
    }
  }, [user]);

  if (!form) return null;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
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
          <p>{user.email} {user.email_verified ? '(confirmed)' : ''}</p>
        </div>
      </div>
      {firstTime && <Notice type="info">Complete your profile before your first booking. Your gender is used for same-gender room sharing.</Notice>}
      <form className="panel stack" onSubmit={submit}>
        <Notice type={save.msg.type}>{save.msg.text}</Notice>
        <div className="row">
          <Field label="First name"><input required maxLength={20} value={form.first_name} onChange={set('first_name')} /></Field>
          <Field label="Last name"><input required maxLength={20} value={form.last_name} onChange={set('last_name')} /></Field>
        </div>
        <div className="row">
          <Field label="Phone number" hint="8 to 11 digits"><input required inputMode="numeric" pattern="\d{8,11}" value={form.phone_number} onChange={set('phone_number')} /></Field>
          <Field label="Citizenship ID (CID)"><input required maxLength={20} value={form.citizenship_id} onChange={set('citizenship_id')} /></Field>
          <Field label="Gender">
            <select required value={form.gender} onChange={set('gender')}>
              <option value="">Choose</option>
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
          </Field>
        </div>
        <div className="row">
          <Field label="Staff or Student ID (RUB members only)"><input maxLength={20} value={form.sid} onChange={set('sid')} /></Field>
          <Field label="Department / affiliation"><input required maxLength={50} value={form.department} onChange={set('department')} /></Field>
        </div>
        <div><button className="btn" disabled={save.busy}>Save profile</button></div>
      </form>

      <h2>Change password</h2>
      <form className="panel stack" onSubmit={changePassword}>
        <Notice type={pwAction.msg.type}>{pwAction.msg.text}</Notice>
        <div className="row">
          <Field label="Current password"><input type="password" required value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} /></Field>
          <Field label="New password"><input type="password" required minLength={8} value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} /></Field>
        </div>
        <div><button className="btn secondary" disabled={pwAction.busy}>Change password</button></div>
      </form>
    </>
  );
}
