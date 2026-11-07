// The meeting hall (25 seats) inside the guest house: Nu. 5,000 per day + 5% GST. Booked separately from rooms.
// Anyone can see the hall, its photos, free days and the fee; booking needs an account.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, qs } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { BillBox, Field, Notice, money, todayStr, useLoad } from '../../components/ui.jsx';
import { Gallery } from '../../components/Photo.jsx';
import { HALL_PHOTOS } from '../../photos.js';

export default function BookHall() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const halls = useLoad(async () => (await api.get('/halls')).halls);
  const [form, setForm] = useState({ hall_id: '', start_date: todayStr(), end_date: todayStr(), number_of_attendees: '', purpose: '' });
  const [check, setCheck] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const hallId = form.hall_id || halls.data?.[0]?.hall_id || '';
  const hall = halls.data?.find((h) => String(h.hall_id) === String(hallId));
  const update = (patch) => { setForm((f) => ({ ...f, ...patch })); setCheck(null); setError(''); };

  const checkHall = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setCheck(await api.get(`/halls/${hallId}/availability${qs({ start_date: form.start_date, end_date: form.end_date })}`));
    } catch (err) {
      setError(err.message);
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const res = await api.post('/hall-bookings', { ...form, hall_id: hallId });
      navigate('/my-bookings', { state: { message: `${res.message} Hall booking #${res.hall_booking.hall_booking_id}.` } });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const canBook = user && user.profile_complete;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Meeting hall</h1>
          <p>The meeting hall is inside the guest house. Check which days are free and the fee; dates do not need to match a room booking.</p>
        </div>
      </div>
      <Gallery photos={HALL_PHOTOS} />
      {hall && (
        <div className="facts">
          <div><strong>{hall.hall_name}</strong><span className="small muted">Inside {hall.guesthouse_name}</span></div>
          <div><strong>{hall.capacity} seats</strong><span className="small muted">Capacity</span></div>
          <div><strong>{money(hall.price_per_day)} per day</strong><span className="small muted">plus 5% GST</span></div>
          <div><strong>{hall.status !== 'Available' ? hall.status : hall.guesthouse_status !== 'Available' ? `Guest house ${hall.guesthouse_status.toLowerCase()}` : 'Open for booking'}</strong><span className="small muted">Status</span></div>
        </div>
      )}
      <p className="small"><Link to="/floor-map">Where is it? See the guest house floor map.</Link></p>
      {!user && <Notice type="info">You can check free days and the fee without an account. To book, <Link to="/login" state={{ from: '/hall' }}>sign in</Link> or <Link to="/register">create an account</Link>.</Notice>}
      {user && !user.profile_complete && <Notice type="info"><Link to="/profile">Complete your profile</Link> before booking the hall.</Notice>}
      <form className="panel stack" onSubmit={checkHall}>
        {halls.data?.length > 1 && (
          <Field label="Hall">
            <select value={hallId} onChange={(e) => update({ hall_id: e.target.value })}>
              {halls.data.map((h) => <option key={h.hall_id} value={h.hall_id}>{h.hall_name} ({h.guesthouse_name})</option>)}
            </select>
          </Field>
        )}
        <div className="row">
          <Field label="First day"><input type="date" required min={todayStr()} value={form.start_date} onChange={(e) => update({ start_date: e.target.value, end_date: e.target.value > form.end_date ? e.target.value : form.end_date })} /></Field>
          <Field label="Last day"><input type="date" required min={form.start_date} value={form.end_date} onChange={(e) => update({ end_date: e.target.value })} /></Field>
          <Field label="Number of attendees"><input type="number" required={!!user} min={1} max={hall?.capacity || 25} value={form.number_of_attendees} onChange={(e) => update({ number_of_attendees: e.target.value })} /></Field>
        </div>
        <Field label="Purpose" hint={user ? undefined : 'Needed when you book.'}><input required={!!user} maxLength={255} value={form.purpose} onChange={(e) => update({ purpose: e.target.value })} /></Field>
        <Notice type="error">{error}</Notice>
        <div><button className="btn secondary">Check the hall and fee</button></div>
      </form>
      {check && (
        <div className="panel stack">
          <h2 style={{ marginTop: 0 }}>Fee for {check.days} day(s)</h2>
          {!check.available && <Notice type="error">{check.reason}</Notice>}
          <BillBox bill={check.bill} />
          <div>
            {canBook && <button className="btn" disabled={!check.available || busy} onClick={submit}>Submit hall booking</button>}
            {!user && <Link className="btn" to="/login" state={{ from: '/hall' }}>Sign in to book the hall</Link>}
          </div>
        </div>
      )}
    </>
  );
}
