// Browse guest houses & rooms, check availability by date (per bed) and the bed-wise charge.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { BedPips, Empty, Field, KeyTag, Notice, addDaysStr, money, todayStr, useLoad } from '../../components/ui.jsx';

export default function BrowseRooms() {
  const { user } = useAuth();
  const [search, setSearch] = useState({ guesthouse_id: '', check_in: todayStr(), check_out: addDaysStr(todayStr(), 1) });
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const base = useLoad(async () => {
    const [gh, rates] = await Promise.all([api.get('/guesthouses'), api.get('/rates')]);
    if (gh.guesthouses[0]) setSearch((s) => ({ ...s, guesthouse_id: s.guesthouse_id || String(gh.guesthouses[0].guesthouse_id) }));
    return { guesthouses: gh.guesthouses, rates: rates.rates };
  });

  const find = async (e) => {
    e?.preventDefault();
    setError('');
    try {
      const data = await api.get(`/rooms/availability${qs(search)}`);
      setResults(data.rooms);
    } catch (err) {
      setError(err.message);
      setResults(null);
    }
  };

  const rate = (cat, type) => base.data?.rates.find((r) => r.guest_category === cat && r.charge_type === type)?.rate;
  const bookLink = (room, type) => `/book/${room.room_id}${qs({ check_in: search.check_in, check_out: search.check_out, type })}`;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Find a room</h1>
          <p>Pick your dates to see free beds. Rooms have 3 beds.</p>
        </div>
      </div>
      {!user.profile_complete && <Notice type="info">You can look around now. <Link to="/profile">Complete your profile</Link> before booking.</Notice>}

      <form className="panel row" onSubmit={find}>
        <Field label="Guest house">
          <select value={search.guesthouse_id} onChange={(e) => setSearch({ ...search, guesthouse_id: e.target.value })}>
            {(base.data?.guesthouses || []).map((g) => (
              <option key={g.guesthouse_id} value={g.guesthouse_id}>{g.guesthouse_name}{g.status !== 'Available' ? ` (${g.status})` : ''}</option>
            ))}
          </select>
        </Field>
        <Field label="Check-in">
          <input type="date" min={todayStr()} value={search.check_in} onChange={(e) => setSearch({ ...search, check_in: e.target.value })} />
        </Field>
        <Field label="Check-out">
          <input type="date" min={addDaysStr(search.check_in, 1)} value={search.check_out} onChange={(e) => setSearch({ ...search, check_out: e.target.value })} />
        </Field>
        <div style={{ flex: '0 0 auto' }}><button className="btn">Check availability</button></div>
      </form>

      <div className="panel small">
        <strong>Charges per night (plus 5% GST)</strong>
        <div className="row" style={{ marginTop: '0.5rem' }}>
          {['RUB staff', 'Other national'].map((c) => (
            <div key={c}>{c}: {money(rate(c, 'Per Bed'))} per bed, {money(rate(c, 'Exclusive Room'))} whole room</div>
          ))}
        </div>
      </div>

      <Notice type="error">{error}</Notice>
      {results && (
        <>
          <div className="bed-legend" style={{ margin: '1rem 0' }}>
            <span><span className="bed" />Free bed</span>
            <span><span className="bed taken" />Taken or blocked</span>
          </div>
          {results.length === 0 && <Empty>This guest house has no rooms yet.</Empty>}
          <div className="grid">
            {results.map((r) => {
              const closed = r.label === 'Not open for booking';
              return (
                <div className="panel room-card" key={r.room_id}>
                  <KeyTag number={r.room_number} closed={closed || r.beds_free === 0} />
                  <div style={{ flex: 1 }}>
                    <h3>Room {r.room_number}</h3>
                    <div className="small muted">{r.room_type}, {r.capacity} beds</div>
                    <BedPips capacity={r.capacity} free={r.beds_free} />
                    <div><strong>{r.label}</strong></div>
                    {r.shared && <div className="small muted">Occupant allows sharing: {r.occupant_gender?.toLowerCase()} guests only.</div>}
                    {!r.bed_available_for_me && r.reason && <div className="small muted">{r.reason}</div>}
                    <div className="actions" style={{ marginTop: '0.6rem' }}>
                      {r.bed_available_for_me && <Link className="btn small" to={bookLink(r, 'Per Bed')}>Book beds</Link>}
                      {r.exclusive_available && <Link className="btn small secondary" to={bookLink(r, 'Exclusive')}>Book whole room</Link>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
