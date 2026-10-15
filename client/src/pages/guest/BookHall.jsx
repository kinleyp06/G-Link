// Book the meeting hall (25 seats): Nu. 5,000 per day + 5% GST. Separate from room bookings.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, qs } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { BillBox, Field, Notice, money, todayStr, useLoad } from '../../components/ui.jsx';

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

  if (!user.profile_complete) {
    return (
      <div className="panel narrow">
        <h1>Complete your profile first</h1>
        <Link className="btn" to="/profile">Complete profile</Link>
      </div>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Book the meeting hall</h1>
          <p>{hall ? `${hall.hall_name}: ${hall.capacity} seats, ${money(hall.price_per_day)} per day plus GST.` : 'Loading...'} Dates do not need to match a room booking.</p>
        </div>
      </div>
      <form className="panel stack" onSubmit={checkHall}>
        {halls.data?.length > 1 && (
          <Field label="Hall">
            <select value={hallId} onChange={(e) => update({ hall_id: e.target.value })}>
              {halls.data.map((h) => <option key={h.hall_id} value={h.hall_id}>{h.hall_name}</option>)}
            </select>
          </Field>
        )}
        <div className="row">
          <Field label="First day"><input type="date" required min={todayStr()} value={form.start_date} onChange={(e) => update({ start_date: e.target.value, end_date: e.target.value > form.end_date ? e.target.value : form.end_date })} /></Field>
          <Field label="Last day"><input type="date" required min={form.start_date} value={form.end_date} onChange={(e) => update({ end_date: e.target.value })} /></Field>
          <Field label="Number of attendees"><input type="number" required min={1} max={hall?.capacity || 25} value={form.number_of_attendees} onChange={(e) => update({ number_of_attendees: e.target.value })} /></Field>
        </div>
        <Field label="Purpose"><input required maxLength={255} value={form.purpose} onChange={(e) => update({ purpose: e.target.value })} /></Field>
        <Notice type="error">{error}</Notice>
        <div><button className="btn secondary">Check the hall and fee</button></div>
      </form>
      {check && (
        <div className="panel stack">
          <h2 style={{ marginTop: 0 }}>Fee for {check.days} day(s)</h2>
          {!check.available && <Notice type="error">{check.reason}</Notice>}
          <BillBox bill={check.bill} />
          <div><button className="btn" disabled={!check.available || busy} onClick={submit}>Submit hall booking</button></div>
        </div>
      )}
    </>
  );
}
