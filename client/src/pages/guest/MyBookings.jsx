// My bookings: room bookings and hall bookings in separate sections.
// Cancel, request a stay extension, see bills and who shares the room.
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../api.js';
import { Badge, Empty, Field, Notice, addDaysStr, money, todayStr, useAction, useLoad } from '../../components/ui.jsx';

function Payments({ payments }) {
  if (!payments?.length) return <p className="small muted">The bill is created when the admin approves.</p>;
  return (
    <div className="bill">
      {payments.map((p) => (
        <div className="bill-line" key={p.payment_id}>
          <span>{p.description || 'Charge'} <span className="muted small">(GST {money(p.gst_amount)})</span></span>
          <span>{money(p.total_amount)} <Badge value={p.payment_status} /></span>
        </div>
      ))}
    </div>
  );
}

function RoomBooking({ b, onChange }) {
  const [extendTo, setExtendTo] = useState('');
  const act = useAction();
  const active = b.booking_status === 'Approved' && !b.checked_out_at && b.check_out_date >= todayStr();
  const pendingExt = b.extensions.find((e) => e.extension_status === 'Pending');

  const cancel = async () => {
    if (!window.confirm('Cancel this booking?')) return;
    if (await act.run(() => api.post(`/bookings/${b.booking_id}/cancel`))) onChange();
  };
  const extend = async (e) => {
    e.preventDefault();
    if (await act.run(() => api.post(`/bookings/${b.booking_id}/extensions`, { new_check_out_date: extendTo }))) onChange();
  };

  return (
    <div className="panel stack">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h3>#{b.booking_id}: Room {b.room_number}, {b.guesthouse_name}</h3>
          <div className="small muted">
            {b.check_in_date} to {b.check_out_date} | {b.booking_type} | {b.number_of_guests} guest(s) | {b.guest_category}
            {b.extension_count > 0 && ` | extended ${b.extension_count} time(s)`}
          </div>
        </div>
        <Badge value={b.checked_in_at && !b.checked_out_at ? 'Checked in' : b.booking_status} />
      </div>
      <Notice type={act.msg.type}>{act.msg.text}</Notice>
      {b.guests.length > 0 && <div className="small">Other guests: {b.guests.map((g) => g.full_name).join(', ')}</div>}
      {b.is_shared_stay && <div className="small">Shared stay: you are taking a free bed in an occupied room.</div>}
      {b.allow_sharing && <div className="small">You allowed sharing on this booking.</div>}
      {b.sharing_with.length > 0 && (
        <div className="small">
          Sharing your room: {b.sharing_with.map((s, i) => (
            <span key={i}>{s.first_name || 'Guest'} ({s.gender}), {s.check_in_date} to {s.check_out_date}{i < b.sharing_with.length - 1 ? '; ' : ''}</span>
          ))}
        </div>
      )}
      <Payments payments={b.payments} />
      {b.extensions.length > 0 && (
        <div className="small">
          Extensions: {b.extensions.map((e) => `to ${e.new_check_out_date} (${e.extension_status})`).join(', ')}
        </div>
      )}
      <div className="actions">
        {['Pending', 'Approved'].includes(b.booking_status) && !b.checked_in_at && (
          <button className="btn danger small" disabled={act.busy} onClick={cancel}>Cancel booking</button>
        )}
      </div>
      {active && !pendingExt && (
        <form className="row" onSubmit={extend}>
          <Field label="Extend my stay until">
            <input type="date" required min={addDaysStr(b.check_out_date, 1)} value={extendTo} onChange={(e) => setExtendTo(e.target.value)} />
          </Field>
          <div style={{ flex: '0 0 auto' }}><button className="btn secondary small" disabled={act.busy}>Request extension</button></div>
        </form>
      )}
      {pendingExt && <div className="small muted">Extension to {pendingExt.new_check_out_date} is waiting for the admin.</div>}
    </div>
  );
}

function HallBooking({ h, onChange }) {
  const act = useAction();
  const cancel = async () => {
    if (!window.confirm('Cancel this hall booking? Your room bookings are not affected.')) return;
    if (await act.run(() => api.post(`/hall-bookings/${h.hall_booking_id}/cancel`))) onChange();
  };
  return (
    <div className="panel stack">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h3>Hall #{h.hall_booking_id}: {h.hall_name}</h3>
          <div className="small muted">{h.start_date} to {h.end_date} | {h.number_of_attendees} attendee(s) | {h.purpose}</div>
        </div>
        <Badge value={h.booking_status} />
      </div>
      <Notice type={act.msg.type}>{act.msg.text}</Notice>
      <Payments payments={h.payments} />
      {['Pending', 'Approved'].includes(h.booking_status) && (
        <div><button className="btn danger small" onClick={cancel} disabled={act.busy}>Cancel hall booking</button></div>
      )}
    </div>
  );
}

export default function MyBookings() {
  const location = useLocation();
  const { data, error, loading, reload } = useLoad(async () => {
    const [rooms, halls] = await Promise.all([api.get('/bookings/mine'), api.get('/hall-bookings/mine')]);
    return { rooms: rooms.bookings, halls: halls.hall_bookings };
  });

  return (
    <>
      <div className="page-head">
        <div><h1>My bookings</h1><p>Room and hall bookings are separate: changing one does not affect the other.</p></div>
        <div className="actions"><Link className="btn" to="/rooms">Book a room</Link><Link className="btn secondary" to="/hall">Book the hall</Link></div>
      </div>
      <Notice type="success">{location.state?.message}</Notice>
      <Notice type="error">{error}</Notice>
      {loading && <p className="muted">Loading...</p>}
      {data && (
        <>
          <h2>Room bookings</h2>
          {data.rooms.length === 0 ? <Empty>No room bookings yet. <Link to="/rooms">Find a room</Link></Empty>
            : data.rooms.map((b) => <RoomBooking key={b.booking_id} b={b} onChange={reload} />)}
          <h2>Hall bookings</h2>
          {data.halls.length === 0 ? <Empty>No hall bookings yet. <Link to="/hall">Book the meeting hall</Link></Empty>
            : data.halls.map((h) => <HallBooking key={h.hall_booking_id} h={h} onChange={reload} />)}
        </>
      )}
    </>
  );
}
