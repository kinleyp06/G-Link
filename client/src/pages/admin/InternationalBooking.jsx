// Admin books for international guests and records their details.
// (VIP / official guests are NOT booked: block the room instead on the Blocks page.)
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { BillBox, Field, Notice, addDaysStr, todayStr, useLoad } from '../../components/ui.jsx';

const emptyGuest = { full_name: '', gender: '', contact_number: '', citizenship_id: '' };

export default function InternationalBooking() {
  const base = useLoad(async () => {
    const [rooms, rates] = await Promise.all([api.get('/admin/rooms'), api.get('/admin/rates')]);
    return { rooms: rooms.rooms, rates: rates.rates };
  });
  const [form, setForm] = useState({
    room_id: '', booking_type: 'Per Bed', check_in_date: todayStr(), check_out_date: addDaysStr(todayStr(), 1), purpose_of_visit: '',
  });
  const [guests, setGuests] = useState([{ ...emptyGuest }]);
  const [shareOk, setShareOk] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [needsShare, setNeedsShare] = useState(false);
  const [busy, setBusy] = useState(false);

  const intlRatesSet = base.data?.rates.filter((r) => r.guest_category === 'International').every((r) => r.rate !== null);
  const maxGuests = form.booking_type === 'Family/Group' ? 3 : 1;
  const setGuest = (i, patch) => setGuests(guests.map((g, j) => (j === i ? { ...g, ...patch } : g)));

  const chooseType = (t) => {
    setForm({ ...form, booking_type: t });
    if (t !== 'Family/Group') setGuests(guests.slice(0, 1));
    else if (guests.length < 2) setGuests([...guests, { ...emptyGuest }]);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post('/admin/bookings/international', {
        ...form,
        guests: guests.map((g) => ({ ...g, guest_category: 'International' })),
        notice_acknowledged: shareOk,
      });
      setResult(res);
      setGuests([{ ...emptyGuest }]);
      setShareOk(false);
      setNeedsShare(false);
    } catch (err) {
      setError(err.message);
      setNeedsShare(err.code === 'SHARING_NOTICE');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-head"><div><h1>Book for an international guest</h1><p>The booking is approved straight away and billed at the International rate.</p></div></div>
      {base.data && !intlRatesSet && (
        <Notice type="info">International rates are not set yet. <Link to="/admin/rates">Set them on the Rates page</Link> first.</Notice>
      )}
      {result && (
        <div className="panel stack">
          <Notice type="success">{result.message}</Notice>
          <BillBox bill={result.bill} />
        </div>
      )}
      <form className="panel stack" onSubmit={submit}>
        <div className="row">
          <Field label="Room">
            <select required value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })}>
              <option value="">Choose a room</option>
              {(base.data?.rooms || []).map((r) => <option key={r.room_id} value={r.room_id}>{r.guesthouse_name} - Room {r.room_number}</option>)}
            </select>
          </Field>
          <Field label="Booking type">
            <select value={form.booking_type} onChange={(e) => chooseType(e.target.value)}>
              <option>Per Bed</option><option>Family/Group</option><option>Exclusive</option>
            </select>
          </Field>
          <Field label="Check-in"><input type="date" required value={form.check_in_date} onChange={(e) => setForm({ ...form, check_in_date: e.target.value })} /></Field>
          <Field label="Check-out"><input type="date" required min={addDaysStr(form.check_in_date, 1)} value={form.check_out_date} onChange={(e) => setForm({ ...form, check_out_date: e.target.value })} /></Field>
        </div>
        <Field label="Purpose of visit"><input required maxLength={255} value={form.purpose_of_visit} onChange={(e) => setForm({ ...form, purpose_of_visit: e.target.value })} /></Field>

        {guests.map((g, i) => (
          <fieldset key={i}>
            <legend>{i === 0 ? 'Main guest' : `Guest ${i + 1}`}</legend>
            <div className="row">
              <Field label="Full name"><input required maxLength={50} value={g.full_name} onChange={(e) => setGuest(i, { full_name: e.target.value })} /></Field>
              <Field label="Gender">
                <select required value={g.gender} onChange={(e) => setGuest(i, { gender: e.target.value })}>
                  <option value="">Choose</option><option>Male</option><option>Female</option><option>Other</option>
                </select>
              </Field>
              <Field label="Contact number"><input inputMode="numeric" pattern="\d{8,11}" value={g.contact_number} onChange={(e) => setGuest(i, { contact_number: e.target.value })} /></Field>
              <Field label="Passport / ID number"><input maxLength={20} value={g.citizenship_id} onChange={(e) => setGuest(i, { citizenship_id: e.target.value })} /></Field>
            </div>
            {i > 0 && <button type="button" className="btn danger small" style={{ marginTop: '0.5rem' }} onClick={() => setGuests(guests.filter((_, j) => j !== i))}>Remove</button>}
          </fieldset>
        ))}
        {guests.length < maxGuests && (
          <div><button type="button" className="btn secondary small" onClick={() => setGuests([...guests, { ...emptyGuest }])}>Add guest</button></div>
        )}
        {needsShare && (
          <label className="check notice info">
            <input type="checkbox" checked={shareOk} onChange={(e) => setShareOk(e.target.checked)} />
            <span>The room is already occupied. The guest has been told the stay involves sharing.</span>
          </label>
        )}
        <Notice type="error">{error}</Notice>
        <div><button className="btn" disabled={busy}>Save booking</button></div>
      </form>
    </>
  );
}
