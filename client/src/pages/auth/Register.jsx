// Sign up with email ID. A confirmation link is emailed (RUB accounts verify through official email).
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { Field, Notice } from '../../components/ui.jsx';

export default function Register() {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('The two passwords do not match.');
    setBusy(true);
    try {
      const { confirm, ...body } = form;
      const res = await api.post('/auth/register', body);
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
        <p className="small muted">Developing locally without email set up? The link is printed in the server terminal.</p>
        <Link className="btn" to="/login">Go to sign in</Link>
      </div>
    );
  }

  return (
    <div className="panel narrow">
      <h1>Create your account</h1>
      <p className="muted small">RUB staff and students: use your official RUB email to get the RUB staff rate.</p>
      <Notice type="error">{error}</Notice>
      <form onSubmit={submit} className="stack">
        <div className="row">
          <Field label="First name"><input required maxLength={20} value={form.first_name} onChange={set('first_name')} /></Field>
          <Field label="Last name"><input required maxLength={20} value={form.last_name} onChange={set('last_name')} /></Field>
        </div>
        <Field label="Email"><input type="email" required maxLength={100} autoComplete="email" value={form.email} onChange={set('email')} /></Field>
        <Field label="Password" hint="At least 8 characters">
          <input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set('password')} />
        </Field>
        <Field label="Confirm password">
          <input type="password" required minLength={8} autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
        </Field>
        <button className="btn" disabled={busy}>{busy ? 'Creating...' : 'Create account'}</button>
      </form>
      <p className="small" style={{ marginTop: '1rem' }}>Already have an account? <Link to="/login">Sign in</Link></p>
    </div>
  );
}
