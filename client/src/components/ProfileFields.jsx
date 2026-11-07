// The profile form, shared by Sign up and the Profile page so both ask the same things in the same layout.
// Only two kinds of guest: RUB (Royal University of Bhutan) members and Non-RUB. The "RUB member"
// switch sets the guest's rate; when it is on, the staff ID and department / affiliation are asked for.
import { Field, Notice, STAFF_ID_NOTE } from './ui.jsx';

export const emptyProfile = {
  first_name: '', last_name: '', phone_number: '', citizenship_id: '', gender: '',
  is_rub_member: false, sid: '', department: '',
};

export function profileFromUser(u) {
  return {
    first_name: u.first_name || '', last_name: u.last_name || '', phone_number: u.phone_number || '',
    citizenship_id: u.citizenship_id || '', gender: u.gender === 'Male' || u.gender === 'Female' ? u.gender : '',
    is_rub_member: !!u.is_rub_member, sid: u.sid || '', department: u.department || '',
  };
}

export default function ProfileFields({ form, setForm }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <>
      <div className="form-grid">
        <Field label="First name"><input required maxLength={20} autoComplete="given-name" value={form.first_name} onChange={set('first_name')} /></Field>
        <Field label="Last name"><input required maxLength={20} autoComplete="family-name" value={form.last_name} onChange={set('last_name')} /></Field>
        <Field label="Phone number" hint="8 to 11 digits">
          <input required inputMode="numeric" pattern="\d{8,11}" autoComplete="tel" value={form.phone_number} onChange={set('phone_number')} />
        </Field>
        <Field label="Citizenship ID (CID)"><input required maxLength={20} value={form.citizenship_id} onChange={set('citizenship_id')} /></Field>
        <Field label="Gender" hint="Used for same-gender room sharing">
          <select required value={form.gender} onChange={set('gender')}>
            <option value="">Choose</option>
            <option>Male</option>
            <option>Female</option>
          </select>
        </Field>
      </div>

      <label className="switch">
        <input
          type="checkbox"
          role="switch"
          checked={form.is_rub_member}
          onChange={(e) => setForm({ ...form, is_rub_member: e.target.checked })}
        />
        <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
        <span>
          <strong>RUB member</strong>
          <span className="small muted"> Turn on if you are staff of the Royal University of Bhutan. You pay the RUB rate; otherwise the Non-RUB rate.</span>
        </span>
      </label>

      {form.is_rub_member && (
        <>
          <div className="form-grid">
            <Field label="Staff ID"><input required maxLength={20} value={form.sid} onChange={set('sid')} /></Field>
            <Field label="Department / Affiliation"><input required maxLength={50} value={form.department} onChange={set('department')} /></Field>
          </div>
          <Notice type="info"><strong>Please note:</strong> {STAFF_ID_NOTE} Please bring your staff ID.</Notice>
        </>
      )}
    </>
  );
}
