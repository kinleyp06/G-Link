// Opens from the link in the confirmation email: /verify-email?token=...
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api.js';
import { Notice } from '../../components/ui.jsx';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [state, setState] = useState({ type: 'info', text: 'Confirming your email...' });
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return; // avoid double call in React StrictMode
    sent.current = true;
    api.post('/auth/verify-email', { token: params.get('token') })
      .then((r) => setState({ type: 'success', text: r.message }))
      .catch((e) => setState({ type: 'error', text: e.message }));
  }, [params]);

  return (
    <div className="panel narrow">
      <h1>Email confirmation</h1>
      <Notice type={state.type}>{state.text}</Notice>
      <Link className="btn" to="/login">Go to sign in</Link>
    </div>
  );
}
