// Manage room bookings: review (approve / reject), see guest contact details, change rooms.
import { useState } from 'react';
import { api, qs } from '../../api.js';
import { Badge, Empty, Field, Notice, Tabs, money, useAction, useLoad } from '../../components/ui.jsx';

function Detail({ id, onChanged }) {
  const { data, error, reload } = useLoad(async () => {
    const [d, rooms] = await Promise.all([api.get(`/admin/bookings/${id}`), api.get('/admin/rooms')]);
    return { ...d, rooms: rooms.rooms };
  }, [id]);
  const act = useAction();
  const [newRoom, setNewRoom] = useState('');
  const [confirmShare, setConfirmShare] = useState(false);

  if (error) return <Notice type="error">{error}</Notice>;
  if (!data) return <p className="muted">Loading...</p>;
  const { booking: b, user, guests, payments, extensions, sharing } = data;

  const done = async (fn) => { if (await act.run(fn)) { reload(); onChanged(); } };
  const moveRoom = async () => {
    const res = await act.run(() => api.put(`/admin/bookings/${b.booking_id}/room`, { room_id: Number(newRoom), confirm_sharing: confirmShare }));
    if (res) { setNewRoom(''); setConfirmShare(false); reload(); onChanged(); }
  };

  return (
    <div className="panel stack">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <h2 style={{ margin: 0 }}>Booking #{b.booking_id}</h2>
        <Badge value={b.booking_status} />
      </div>
      <Notice type={act.msg.type}>{act.msg.text}</Notice>
      <div className="small">
        Room {b.room_number} | {b.check_in_date} to {b.check_out_date} | {b.booking_type} | {b.guest_category} | {b.gender}
        <br />Purpose: {b.purpose_of_visit} | Guests: {b.number_of_guests} | Sharing allowed: {b.allow_sharing ? 'yes' : 'no'} | Extensions: {b.extension_count}
        {b.checked_in_at && <><br />Checked in {b.checked_in_at}{b.checked_out_at && `, out ${b.checked_out_at}`}</>}
      </div>
      {user ? (
        <div className="small"><strong>Booker:</strong> {user.first_name} {user.last_name}, {user.email}, {user.phone_number}, CID {user.citizenship_id}, {user.department}{user.sid && `, SID ${user.sid}`}</div>
      ) : (
        <div className="small"><strong>Entered by admin</strong> (international guest)</div>
      )}
      {guests.length > 0 && (
        <div className="small"><strong>Guests:</strong> {guests.map((g) => `${g.full_name} (${g.gender}, ${g.guest_category}${g.contact_number ? `, ${g.contact_number}` : ''}${g.citizenship_id ? `, ID ${g.citizenship_id}` : ''})`).join('; ')}</div>
      )}
      {sharing.length > 0 && (
        <div className="small"><strong>Room sharing:</strong> {sharing.map((s) => (
          s.host_booking_id === b.booking_id
            ? `#${s.guest_id} ${s.guest_name || 'guest'} shares this room (${s.guest_phone || s.guest_email || 'no contact'})`
            : `shares with occupant #${s.host_id} ${s.host_name || ''} (${s.host_phone || s.host_email || 'no contact'})`
        )).join('; ')}</div>
      )}
      {payments.length > 0 && <div className="small"><strong>Bills:</strong> {payments.map((p) => `${p.description}: ${money(p.total_amount)} (${p.payment_status})`).join('; ')}</div>}
      {extensions.length > 0 && <div className="small"><strong>Extensions:</strong> {extensions.map((e) => `to ${e.new_check_out_date} (${e.extension_status})`).join('; ')}</div>}

      {b.booking_status === 'Pending' && (
        <div className="actions">
          <button className="btn" disabled={act.busy} onClick={() => done(() => api.post(`/admin/bookings/${b.booking_id}/approve`))}>Approve</button>
          <button className="btn danger" disabled={act.busy} onClick={() => done(() => api.post(`/admin/bookings/${b.booking_id}/reject`))}>Reject</button>
        </div>
      )}
      {['Pending', 'Approved'].includes(b.booking_status) && !b.checked_out_at && (
        <div className="row">
          <Field label="Change room to">
            <select value={newRoom} onChange={(e) => setNewRoom(e.target.value)}>
              <option value="">Choose a room</option>
              {data.rooms.filter((r) => r.room_id !== b.room_id).map((r) => (
                <option key={r.room_id} value={r.room_id}>{r.guesthouse_name} - Room {r.room_number}</option>
              ))}
            </select>
          </Field>
          <label className="check" style={{ flex: '0 1 auto' }}>
            <input type="checkbox" checked={confirmShare} onChange={(e) => setConfirmShare(e.target.checked)} />
            <span className="small">Allow moving into a shared room</span>
          </label>
          <div style={{ flex: '0 0 auto' }}><button className="btn secondary" disabled={!newRoom || act.busy} onClick={moveRoom}>Move booking</button></div>
        </div>
      )}
    </div>
  );
}

export default function ManageBookings() {
  const [status, setStatus] = useState('Pending');
  const [selected, setSelected] = useState(null);
  const { data, error, reload } = useLoad(async () => (await api.get(`/admin/bookings${qs({ status })}`)).bookings, [status]);

  return (
    <>
      <div className="page-head"><div><h1>Room bookings</h1><p>Approve or reject requests, see guest details and change rooms.</p></div></div>
      <Tabs value={status} options={['Pending', 'Approved', 'Rejected', 'Cancelled', 'Completed', '']} onChange={(s) => { setStatus(s); setSelected(null); }} />
      <Notice type="error">{error}</Notice>
      {selected && <Detail id={selected} onChanged={reload} />}
      {data && data.length === 0 && <Empty>No {status.toLowerCase()} bookings.</Empty>}
      {data && data.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Booker</th><th>Room</th><th>Dates</th><th>Type</th><th>Guests</th><th>Category</th><th>Status</th></tr></thead>
            <tbody>
              {data.map((b) => (
                <tr key={b.booking_id} className={`clickable ${selected === b.booking_id ? 'selected' : ''}`} onClick={() => setSelected(b.booking_id)}>
                  <td>{b.booking_id}</td>
                  <td>{b.booker_name}<div className="small muted">{b.booker_email || 'admin entry'}</div></td>
                  <td>{b.room_number}<div className="small muted">{b.guesthouse_name}</div></td>
                  <td>{b.check_in_date}<br />{b.check_out_date}</td>
                  <td>{b.booking_type}{b.allow_sharing ? <div className="small muted">sharing ok</div> : null}</td>
                  <td>{b.number_of_guests}</td>
                  <td>{b.guest_category}</td>
                  <td><Badge value={b.booking_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
