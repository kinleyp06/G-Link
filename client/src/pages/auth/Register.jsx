// Sign up with email ID. The form asks the same things as the Profile page (name, phone, CID,
// gender, RUB member + staff ID + department), so the profile is complete from the start.
// A confirmation link is emailed; the account works once it is confirmed.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { Field, Notice } from '../../components/ui.jsx';
import ProfileFields, { emptyProfile } from '../../components/ProfileFields.jsx';

export default function Register() {
  const [account, setAccount] = useState({ email: '', password: '', confirm: '' });
  const [profile, setProfile] = useState(emptyProfile);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setAccount({ ...account, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (account.password !== account.confirm) return setError('The two passwords do not match.');
    setBusy(true);
    try {
      const res = await api.post('/auth/register', { email: account.email, password: account.password, ...profile });
      setDone(res.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="panel narrow">
        <h1>Check your email</h1>
        <Notice type="success">{done}</Notice>
        <p className="small muted">The email comes from the G-Link Gmail account. Not there after a few minutes? Check your Spam folder, or ask for a new link on the sign in page.</p>
        <Link className="btn" to="/login">Go to sign in</Link>
      </div>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Create your account</h1>
          <p>The same details as your profile. You can change them later on the Profile page.</p>
        </div>
      </div>
      <form onSubmit={submit} className="panel stack">
        <h2 className="form-section">Your details</h2>
        <ProfileFields form={profile} setForm={setProfile} />

        <h2 className="form-section">Sign-in details</h2>
        <div className="form-grid">
          <Field label="Email" className="full"><input type="email" required maxLength={100} autoComplete="email" value={account.email} onChange={set('email')} /></Field>
          <Field label="Password" hint="At least 8 characters">
            <input type="password" required minLength={8} autoComplete="new-password" value={account.password} onChange={set('password')} />
          </Field>
          <Field label="Confirm password">
            <input type="password" required minLength={8} autoComplete="new-password" value={account.confirm} onChange={set('confirm')} />
          </Field>
        </div>

        <Notice type="error">{error}</Notice>
        <div className="actions">
          <button className="btn" disabled={busy}>{busy ? 'Creating...' : 'Create account'}</button>
        </div>
        <p className="small" style={{ margin: 0 }}>Already have an account? <Link to="/login">Sign in</Link></p>
      </form>
    </>
  );
}
