// Super Admin (ICT unit): manage admins, incharges and users. Change roles, deactivate accounts,
// create staff accounts and reset passwords.
import { useState } from 'react';
import { api, qs } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Badge, Field, Notice, useAction, useLoad } from '../../components/ui.jsx';

const ROLES = ['Guest', 'Incharge', 'Admin', 'Super Admin'];

function UserRow({ u, me, act, onSaved }) {
  const [role, setRole] = useState(u.role);
  const [status, setStatus] = useState(u.status);
  const changed = role !== u.role || status !== u.status;
  const self = u.user_id === me.user_id;
  const save = async () => { if (await act.run(() => api.put(`/superadmin/users/${u.user_id}`, { role, status }))) onSaved(); };
  const reset = async () => {
    const pw = window.prompt(`New password for ${u.email} (8+ characters):`);
    if (pw) await act.run(() => api.put(`/superadmin/users/${u.user_id}/password`, { password: pw }));
  };
  return (
    <tr>
      <td>{u.first_name} {u.last_name}<div className="small muted">{u.email}</div></td>
      <td>{u.phone_number}<div className="small muted">{u.department}</div></td>
      <td>
        <select value={role} disabled={self} onChange={(e) => setRole(e.target.value)} aria-label="Role">
          {ROLES.map((r) => <option key={r}>{r}</option>)}
        </select>
      </td>
      <td>
        <select value={status} disabled={self} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option>Active</option><option>Inactive</option>
        </select>
      </td>
      <td><Badge value={u.email_verified ? 'Active' : 'Pending'} /> <span className="small muted">{u.email_verified ? 'email confirmed' : 'not confirmed'}</span></td>
      <td>
        <div className="actions">
          <button className="btn small" disabled={!changed || act.busy} onClick={save}>Save</button>
          <button className="btn secondary small" onClick={reset}>Reset password</button>
        </div>
      </td>
    </tr>
  );
}

export default function ManageUsers() {
  const { user: me } = useAuth();
  const [filter, setFilter] = useState({ role: '', q: '' });
  const [query, setQuery] = useState(filter);
  const { data, error, reload } = useLoad(async () => (await api.get(`/superadmin/users${qs(query)}`)).users, [query]);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', role: 'Admin' });
  const act = useAction();

  const create = async (e) => {
    e.preventDefault();
    if (await act.run(() => api.post('/superadmin/users', form))) {
      setForm({ first_name: '', last_name: '', email: '', password: '', role: 'Admin' });
      reload();
    }
  };

  return (
    <>
      <div className="page-head"><div><h1>Users</h1><p>Super Admin, Admin, Incharge and Guest are all user accounts told apart by role.</p></div></div>
      <Notice type={act.msg.type}>{act.msg.text}</Notice>
      <Notice type="error">{error}</Notice>

      <form className="panel stack" onSubmit={create}>
        <h3>Create a staff account</h3>
        <div className="row">
          <Field label="First name"><input required maxLength={20} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></Field>
          <Field label="Last name"><input required maxLength={20} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></Field>
          <Field label="Email"><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Temporary password"><input required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          <Field label="Role">
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
          </Field>
        </div>
        <div><button className="btn" disabled={act.busy}>Create account</button></div>
      </form>

      <form className="row" style={{ margin: '1rem 0' }} onSubmit={(e) => { e.preventDefault(); setQuery(filter); }}>
        <Field label="Search name or email"><input value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} /></Field>
        <Field label="Role">
          <select value={filter.role} onChange={(e) => setFilter({ ...filter, role: e.target.value })}>
            <option value="">All roles</option>{ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <div style={{ flex: '0 0 auto' }}><button className="btn secondary">Search</button></div>
      </form>

      <div className="table-wrap">
        <table>
          <thead><tr><th>User</th><th>Contact</th><th>Role</th><th>Status</th><th>Email</th><th></th></tr></thead>
          <tbody>
            {(data || []).map((u) => <UserRow key={`${u.user_id}-${u.role}-${u.status}`} u={u} me={me} act={act} onSaved={reload} />)}
          </tbody>
        </table>
      </div>
    </>
  );
}
