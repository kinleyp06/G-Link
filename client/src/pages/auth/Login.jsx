// Sign in with email ID. Then each role goes to its own start page.
// The form sits beside an evening photo of the guest house.
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth, homeFor } from '../../context/AuthContext.jsx';
import { Field, Notice } from '../../components/ui.jsx';
import { SIGN_IN_PHOTO, photoUrl } from '../../photos.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [needsVerify, setNeedsVerify] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const user = await login(form.email, form.password);
      navigate(location.state?.from && user.role === 'Guest' ? location.state.from : homeFor(user), { replace: true });
    } catch (err) {
      setError(err.message);
      setNeedsVerify(err.code === 'EMAIL_NOT_VERIFIED');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    const res = await api.post('/auth/resend-verification', { email: form.email });
    setInfo(res.message);
    setError('');
  };

  return (
    <div className="auth-split">
      <div className="auth-photo" style={{ backgroundImage: `linear-gradient(to top, rgba(0,27,97,0.85), rgba(0,27,97,0.05) 60%), url(${photoUrl(SIGN_IN_PHOTO.file)})` }} role="img" aria-label={SIGN_IN_PHOTO.label}>
        <div>
          <div className="eyebrow">CST Guest House</div>
          <p>Welcome back. Sign in to book a bed, a room or the conference hall.</p>
        </div>
      </div>
      <div className="auth-form">
      <h1>Sign in</h1>
      <Notice type="error">{error}</Notice>
      <Notice type="success">{info}</Notice>
      {needsVerify && (
        <p><button type="button" className="btn secondary small" onClick={resend}>Send the confirmation email again</button></p>
      )}
      <form onSubmit={submit} className="stack">
        <Field label="Email">
          <input type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password">
          <input type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <button className="btn" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
      </form>
      <p className="small" style={{ marginTop: '1rem' }}>No account yet? <Link to="/register">Sign up</Link></p>
      </div>
    </div>
  );
}
