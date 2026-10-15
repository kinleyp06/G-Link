// Book a room: choose booking type (Exclusive / Per bed / Family-group), the rate is picked
// from the guest category, check the bill (+5% GST), confirm the sharing notice if needed, submit.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { BillBox, Field, KeyTag, Notice, addDaysStr, todayStr, useLoad } from '../../components/ui.jsx';

const TYPES = [
  ['Per Bed', 'One bed', 'You take one bed. Other beds may be used by other guests.'],
  ['Family/Group', 'Family or group', 'You and up to 2 more people, each on their own bed.'],
  ['Exclusive', 'Whole room', 'The room is yours alone (1 occupant). Never shared.'],
];
const emptyGuest = { full_name: '', gender: '', contact_number: '', citizenship_id: '', staff_id: '', guest_category: 'Other national' };

export default function BookRoom() {
  const { roomId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const base = useLoad(async () => {
    const [opt, room] = await Promise.all([api.get('/bookings/options'), api.get(`/rooms/${roomId}`)]);
    return { options: opt, room: room.room };
  }, [roomId]);

  const [form, setForm] = useState({
    booking_type: params.get('type') || 'Per Bed',
    guest_category: '',
    check_in_date: params.get('check_in') || todayStr(),
    check_out_date: params.get('check_out') || addDaysStr(todayStr(), 1),
    purpose_of_visit: '',
    allow_sharing: false,
    additional_guests: [],
  });
  const [quote, setQuote] = useState(null);
  const [ack, setAck] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (base.data && !form.guest_category) setForm((f) => ({ ...f, guest_category: base.data.options.categories[0] }));
  }, [base.data, form.guest_category]);

  if (base.loading) return <p className="muted">Loading...</p>;
  if (base.error) return <Notice type="error">{base.error}</Notice>;
  const { options, room } = base.data;

  if (!options.profile_complete) {
    return (
      <div className="panel narrow">
        <h1>Complete your profile first</h1>
        <p>Your name, CID, gender, contact number and department are needed before your first booking.</p>
        <Link className="btn" to="/profile">Complete profile</Link>
      </div>
    );
  }

  // Any change clears the old quote so the bill always matches the form.
  const update = (patch) => { setForm((f) => ({ ...f, ...patch })); setQuote(null); setAck(false); setError(''); };
  const setGuest = (i, patch) => update({ additional_guests: form.additional_guests.map((g, j) => (j === i ? { ...g, ...patch } : g)) });
  const maxExtra = room.capacity - 1;

  const chooseType = (t) => {
    const patch = { booking_type: t };
    if (t === 'Family/Group' && form.additional_guests.length === 0) patch.additional_guests = [{ ...emptyGuest }];
    if (t !== 'Family/Group') patch.additional_guests = [];
    if (t === 'Exclusive') patch.allow_sharing = false;
    update(patch);
  };

  const body = () => ({ ...form, room_id: Number(roomId) });

  const checkPrice = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      setQuote(await api.post('/bookings/quote', body()));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api.post('/bookings', { ...body(), notice_acknowledged: ack });
      navigate('/my-bookings', { state: { message: `${res.message} Booking #${res.booking.booking_id}.` } });
    } catch (err) {
      if (err.code === 'SHARING_NOTICE') setQuote((q) => q && { ...q, availability: { ...q.availability, shared: true } });
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = quote?.availability.available && (!quote.availability.shared || ack);

  return (
    <>
      <div className="page-head">
        <div className="room-card">
          <KeyTag number={room.room_number} />
          <div>
            <h1>Book room {room.room_number}</h1>
            <p>{room.guesthouse_name}, {room.capacity} beds. Booking for {user.first_name} {user.last_name} ({user.gender}).</p>
          </div>
        </div>
      </div>

      <form className="stack" onSubmit={checkPrice}>
        <fieldset>
          <legend>Booking type</legend>
          <div className="choice">
            {TYPES.map(([value, title, text]) => (
              <label key={value}>
                <input type="radio" name="type" checked={form.booking_type === value} onChange={() => chooseType(value)} />
                <span><strong>{title}</strong><br /><span className="small muted">{text}</span></span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="panel stack">
          <div className="row">
            <Field label="Check-in">
              <input type="date" required min={todayStr()} value={form.check_in_date} onChange={(e) => update({ check_in_date: e.target.value })} />
            </Field>
            <Field label="Check-out">
              <input type="date" required min={addDaysStr(form.check_in_date, 1)} value={form.check_out_date} onChange={(e) => update({ check_out_date: e.target.value })} />
            </Field>
            <Field label="Your rate category" hint={options.is_rub_email ? '' : 'RUB staff rate needs an official RUB email.'}>
              <select value={form.guest_category} onChange={(e) => update({ guest_category: e.target.value })}>
                {options.categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Purpose of visit">
            <input required maxLength={255} value={form.purpose_of_visit} onChange={(e) => update({ purpose_of_visit: e.target.value })} />
          </Field>
          {form.booking_type !== 'Exclusive' && (
            <label className="check">
              <input type="checkbox" checked={form.allow_sharing} onChange={(e) => update({ allow_sharing: e.target.checked })} />
              <span>Allow sharing: free beds in my room may be offered to other {user.gender?.toLowerCase()} guests. I will get an email with their first name and dates.</span>
            </label>
          )}
        </div>

        {form.booking_type === 'Family/Group' && (
          <fieldset className="stack">
            <legend>Other guests ({form.additional_guests.length} of {maxExtra})</legend>
            {form.additional_guests.map((g, i) => (
              <div className="panel stack" key={i}>
                <div className="row">
                  <Field label="Full name"><input required maxLength={50} value={g.full_name} onChange={(e) => setGuest(i, { full_name: e.target.value })} /></Field>
                  <Field label="Gender">
                    <select required value={g.gender} onChange={(e) => setGuest(i, { gender: e.target.value })}>
                      <option value="">Choose</option><option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </Field>
                  <Field label="Rate category" hint="Family members of RUB staff use Other national">
                    <select value={g.guest_category} onChange={(e) => setGuest(i, { guest_category: e.target.value })}>
                      {options.guest_categories.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="row">
                  <Field label="Contact number"><input inputMode="numeric" pattern="\d{8,11}" value={g.contact_number} onChange={(e) => setGuest(i, { contact_number: e.target.value })} /></Field>
                  <Field label="CID"><input maxLength={20} value={g.citizenship_id} onChange={(e) => setGuest(i, { citizenship_id: e.target.value })} /></Field>
                  {g.guest_category === 'RUB staff' && (
                    <Field label="Staff ID"><input required maxLength={20} value={g.staff_id} onChange={(e) => setGuest(i, { staff_id: e.target.value })} /></Field>
                  )}
                </div>
                <div>
                  <button type="button" className="btn danger small" onClick={() => update({ additional_guests: form.additional_guests.filter((_, j) => j !== i) })}>Remove guest</button>
                </div>
              </div>
            ))}
            {form.additional_guests.length < maxExtra && (
              <div><button type="button" className="btn secondary small" onClick={() => update({ additional_guests: [...form.additional_guests, { ...emptyGuest }] })}>Add another guest</button></div>
            )}
          </fieldset>
        )}

        <Notice type="error">{error}</Notice>
        <div><button className="btn secondary" disabled={busy}>Check availability and price</button></div>
      </form>

      {quote && (
        <div className="panel stack" style={{ marginTop: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Your bill for {quote.nights} night(s)</h2>
          {!quote.availability.available && <Notice type="error">{quote.availability.reason}</Notice>}
          <BillBox bill={quote.bill} />
          <p className="small muted">You pay for all guests on this booking. Payment is made at the guest house.</p>
          {quote.availability.available && quote.availability.shared && (
            <div className="notice info">
              <p><strong>This room is already occupied and your stay involves sharing.</strong> The occupant will be told your first name, gender and dates. Your contact details stay with the administration.</p>
              <label className="check">
                <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
                <span>I understand and want to share this room.</span>
              </label>
            </div>
          )}
          <div className="actions">
            <button className="btn" disabled={!canSubmit || busy} onClick={submit}>Submit booking</button>
            <Link className="btn secondary" to="/rooms">Pick another room</Link>
          </div>
        </div>
      )}
    </>
  );
}
