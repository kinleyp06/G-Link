// Manage meeting hall bookings (approve / reject) and the hall's price and status.
import { useEffect, useState } from 'react';
import { api, qs } from '../../api.js';
import { Badge, Empty, Field, Notice, Tabs, useAction, useLoad } from '../../components/ui.jsx';

function HallSettings() {
  const { data, reload } = useLoad(async () => (await api.get('/admin/halls')).halls);
  const [form, setForm] = useState(null);
  const act = useAction();
  useEffect(() => { if (data?.[0]) setForm(data[0]); }, [data]);
  if (!form) return null;
  const save = async (e) => {
    e.preventDefault();
    if (await act.run(() => api.put(`/admin/halls/${form.hall_id}`, form))) reload();
  };
  return (
    <form className="panel stack" onSubmit={save}>
      <h3>Hall settings</h3>
      <Notice type={act.msg.type}>{act.msg.text}</Notice>
      <div className="row">
        <Field label="Name"><input value={form.hall_name} maxLength={50} onChange={(e) => setForm({ ...form, hall_name: e.target.value })} /></Field>
        <Field label="Seats"><input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></Field>
        <Field label="Price per day (Nu., before GST)"><input type="number" min={0} step="0.01" value={form.price_per_day} onChange={(e) => setForm({ ...form, price_per_day: e.target.value })} /></Field>
        <Field label="Status">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option>Available</option><option>Closed</option><option>Maintenance</option>
          </select>
        </Field>
        <div style={{ flex: '0 0 auto' }}><button className="btn secondary">Save hall</button></div>
      </div>
    </form>
  );
}

export default function HallBookings() {
  const [status, setStatus] = useState('Pending');
  const { data, error, reload } = useLoad(async () => (await api.get(`/admin/hall-bookings${qs({ status })}`)).hall_bookings, [status]);
  const act = useAction();
  const decide = async (id, what) => { if (await act.run(() => api.post(`/admin/hall-bookings/${id}/${what}`))) reload(); };

  return (
    <>
      <div className="page-head"><div><h1>Meeting hall</h1><p>Hall bookings have their own ID, dates, status and bill.</p></div></div>
      <HallSettings />
      <Tabs value={status} options={['Pending', 'Approved', 'Rejected', 'Cancelled', '']} onChange={setStatus} />
      <Notice type={act.msg.type}>{act.msg.text}</Notice>
      <Notice type="error">{error}</Notice>
      {data && data.length === 0 && <Empty>No {status.toLowerCase()} hall bookings.</Empty>}
      {data && data.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Booked by</th><th>Days</th><th>Attendees</th><th>Purpose</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {data.map((h) => (
                <tr key={h.hall_booking_id}>
                  <td>{h.hall_booking_id}</td>
                  <td>{h.booker_name}<div className="small muted">{h.booker_email}<br />{h.booker_phone}</div></td>
                  <td>{h.start_date}<br />{h.end_date}</td>
                  <td>{h.number_of_attendees}</td>
                  <td>{h.purpose}</td>
                  <td><Badge value={h.booking_status} /></td>
                  <td>
                    {h.booking_status === 'Pending' && (
                      <div className="actions">
                        <button className="btn small" disabled={act.busy} onClick={() => decide(h.hall_booking_id, 'approve')}>Approve</button>
                        <button className="btn danger small" disabled={act.busy} onClick={() => decide(h.hall_booking_id, 'reject')}>Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
