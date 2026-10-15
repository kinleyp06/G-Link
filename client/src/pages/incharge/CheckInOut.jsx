// Incharge: view bookings, check guests in and out, mark no-shows,
// and add extra people who arrive on an exclusive booking (charged per bed, or turned away if no beds are free).
import { useState } from 'react';
import { api, qs } from '../../api.js';
import { BillBox, Empty, Field, Notice, todayStr, useAction, useLoad } from '../../components/ui.jsx';

function ExtraPeople({ b, act, onDone }) {
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState([{ full_name: '', gender: '', guest_category: b.guest_category === 'International' ? 'International' : 'Other national', staff_id: '' }]);
  const [bill, setBill] = useState(null);
  const free = b.capacity - b.number_of_guests;
  if (b.booking_type !== 'Exclusive') return null;
  if (!open) return <button className="btn secondary small" onClick={() => setOpen(true)}>Extra people arrived</button>;
  const set = (i, patch) => setPeople(people.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const save = async () => {
    const res = await act.run(() => api.post(`/incharge/bookings/${b.booking_id}/extra-guests`, { guests: people }));
    if (res) { setBill(res.bill); onDone(); }
  };
  return (
    <div className="panel stack" style={{ marginTop: '0.5rem' }}>
      <div className="small">{free > 0 ? `${free} bed(s) free in this room. Extra people are charged per bed.` : 'No beds free: the extra people must be turned away.'}</div>
      {bill && <BillBox bill={bill} />}
      {free > 0 && !bill && (
        <>
          {people.map((p, i) => (
            <div className="row" key={i}>
              <Field label="Full name"><input value={p.full_name} maxLength={50} onChange={(e) => set(i, { full_name: e.target.value })} /></Field>
              <Field label="Gender">
                <select value={p.gender} onChange={(e) => set(i, { gender: e.target.value })}>
                  <option value="">Choose</option><option>Male</option><option>Female</option><option>Other</option>
                </select>
              </Field>
              <Field label="Category">
                <select value={p.guest_category} onChange={(e) => set(i, { guest_category: e.target.value })}>
                  <option>RUB staff</option><option>Other national</option><option>International</option>
                </select>
              </Field>
              {p.guest_category === 'RUB staff' && <Field label="Staff ID"><input value={p.staff_id} onChange={(e) => set(i, { staff_id: e.target.value })} /></Field>}
            </div>
          ))}
          <div className="actions">
            {people.length < free && <button className="btn secondary small" onClick={() => setPeople([...people, { full_name: '', gender: '', guest_category: 'Other national', staff_id: '' }])}>Add person</button>}
            <button className="btn small" onClick={save} disabled={act.busy}>Add and bill</button>
            <button className="btn secondary small" onClick={() => setOpen(false)}>Close</button>
          </div>
        </>
      )}
    </div>
  );
}

function BookingTable({ rows, children }) {
  if (!rows.length) return <Empty>Nobody here.</Empty>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>#</th><th>Guest</th><th>Room</th><th>Dates</th><th>Type</th><th>Guests</th><th></th></tr></thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.booking_id}>
              <td>{b.booking_id}</td>
              <td>{b.guest_name}<div className="small muted">{b.guest_phone}</div></td>
              <td>{b.room_number}<div className="small muted">{b.guesthouse_name}</div></td>
              <td>{b.check_in_date} to {b.check_out_date}</td>
              <td>{b.booking_type}</td>
              <td>{b.number_of_guests}</td>
              <td>{children(b)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CheckInOut() {
  const [day, setDay] = useState(todayStr());
  const { data, error, reload } = useLoad(() => api.get(`/incharge/bookings${qs({ date: day })}`), [day]);
  const act = useAction();
  const go = async (id, what, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    if (await act.run(() => api.post(`/incharge/bookings/${id}/${what}`))) reload();
  };

  return (
    <>
      <div className="page-head">
        <div><h1>Check-in and check-out</h1><p>Approved bookings arriving, staying and coming up.</p></div>
        <Field label="Day"><input type="date" value={day} onChange={(e) => setDay(e.target.value)} /></Field>
      </div>
      <Notice type={act.msg.type}>{act.msg.text}</Notice>
      <Notice type="error">{error}</Notice>
      {data && (
        <>
          <h2>Arriving (not checked in yet)</h2>
          <BookingTable rows={data.arrivals}>
            {(b) => (
              <div className="actions">
                <button className="btn small" disabled={act.busy || day !== todayStr()} title={day !== todayStr() ? 'Check-in happens on the day' : ''} onClick={() => go(b.booking_id, 'check-in')}>Check in</button>
                <button className="btn danger small" disabled={act.busy} onClick={() => go(b.booking_id, 'no-show', 'Mark as no-show? The booking will be cancelled.')}>No-show</button>
              </div>
            )}
          </BookingTable>
          <h2>In the guest house</h2>
          <BookingTable rows={data.in_house}>
            {(b) => (
              <div className="stack">
                <div className="actions">
                  <button className="btn small" disabled={act.busy} onClick={() => go(b.booking_id, 'check-out', `Check out booking #${b.booking_id}?`)}>Check out</button>
                </div>
                <ExtraPeople b={b} act={act} onDone={reload} />
              </div>
            )}
          </BookingTable>
          <h2>Coming up</h2>
          <BookingTable rows={data.upcoming}>{() => null}</BookingTable>
        </>
      )}
    </>
  );
}
