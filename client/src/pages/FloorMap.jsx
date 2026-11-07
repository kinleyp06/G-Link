// Floor map: the plan of each floor with its rooms and tonight's free beds, the meeting hall inside the
// guest house, and the campus map showing where the guest house is. Open to everyone, no sign-in needed.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { BedPips, Empty, Field, Notice, addDaysStr, money, todayStr, useLoad } from '../components/ui.jsx';
import { Photo } from '../components/Photo.jsx';
import { HALL_PHOTOS, SITE_MAP, floorCorridor, floorName, floorOf, floorPlan, hasFloorPlan } from '../photos.js';

export default function FloorMap() {
  const { user } = useAuth();
  const [ghId, setGhId] = useState('');

  const base = useLoad(async () => {
    const [gh, halls] = await Promise.all([api.get('/guesthouses'), api.get('/halls')]);
    return { guesthouses: gh.guesthouses, halls: halls.halls };
  });
  const guesthouseId = ghId || base.data?.guesthouses[0]?.guesthouse_id || '';
  const guesthouse = base.data?.guesthouses.find((g) => String(g.guesthouse_id) === String(guesthouseId));

  // Tonight's free beds for every room in the guest house.
  const rooms = useLoad(async () => {
    if (!guesthouseId) return [];
    const tonight = { guesthouse_id: guesthouseId, check_in: todayStr(), check_out: addDaysStr(todayStr(), 1) };
    return (await api.get(`/rooms/availability${qs(tonight)}`)).rooms;
  }, [guesthouseId]);

  const floors = {};
  for (const r of rooms.data || []) (floors[floorOf(r)] ||= []).push(r);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Find your way</div>
          <h1>Floor map</h1>
          <p>Where each room is, and how many beds are free tonight. Rooms 1–4 are on the ground floor and 5–8 on the first floor, 3 beds each. The two suites are reserved for college VIP guests.</p>
        </div>
        {base.data?.guesthouses.length > 1 && (
          <Field label="Guest house">
            <select value={guesthouseId} onChange={(e) => setGhId(e.target.value)}>
              {base.data.guesthouses.map((g) => <option key={g.guesthouse_id} value={g.guesthouse_id}>{g.guesthouse_name}</option>)}
            </select>
          </Field>
        )}
      </div>
      <Notice type="error">{base.error || rooms.error}</Notice>
      {!user && <Notice type="info">Looking is free. To book a bed or the hall, <Link to="/login">sign in</Link> or <Link to="/register">create an account</Link>.</Notice>}

      {guesthouse && <h2>{guesthouse.guesthouse_name}<span className="small muted"> | {guesthouse.location}</span></h2>}
      {rooms.data && rooms.data.length === 0 && <Empty>This guest house has no rooms yet.</Empty>}

      {Object.keys(floors).sort((a, b) => a - b).map((floor) => (
        <section className="panel" key={floor}>
          <h3>{floorName(floor)}</h3>
          <div className="floor">
            {/* The drawn plan if there is one; otherwise the corridor photo of that floor. */}
            {hasFloorPlan(floor) || !floorCorridor(floor)
              ? <Photo photo={floorPlan(floor, floors[floor].map((r) => r.room_number))} map />
              : <Photo photo={floorCorridor(floor)} caption />}
            <div className="stack">
            <ul className="floor-rooms">
              {floors[floor].map((r) => (
                <li key={r.room_id} className={r.vip_only ? 'vip' : ''}>
                  <span className="num">{r.room_number}</span>
                  {r.vip_only ? (
                    <span style={{ flex: 1 }} className="small"><span className="vip-tag">VIP</span> Reserved for college VIP guests</span>
                  ) : (
                    <>
                      <span style={{ flex: 1 }}>
                        <BedPips capacity={r.capacity} free={r.beds_free} />
                        <span className="small">{r.label} tonight</span>
                      </span>
                      <Link className="btn secondary small" to="/rooms">Check dates</Link>
                    </>
                  )}
                </li>
              ))}
            </ul>
            {hasFloorPlan(floor) && floorCorridor(floor) && <Photo photo={floorCorridor(floor)} caption />}
            </div>
          </div>
        </section>
      ))}

      {(base.data?.halls || []).filter((h) => String(h.guesthouse_id) === String(guesthouseId)).map((h) => (
        <section className="panel" key={h.hall_id}>
          <h3>{h.hall_name} <span className="small muted">inside {h.guesthouse_name}</span></h3>
          <div className="floor">
            <Photo photo={HALL_PHOTOS[1]} caption />
            <div className="stack">
              <p className="small">{h.capacity} seats, {money(h.price_per_day)} per day plus GST. Go up the stairs next to the dining hall (shown on the ground floor plan).</p>
              <div><Link className="btn small" to="/hall">See free days</Link></div>
            </div>
          </div>
        </section>
      ))}

      <section className="panel">
        <h3>Finding the guest house</h3>
        <div className="floor">
          <Photo photo={SITE_MAP} map caption />
          <div className="stack">
            <p className="small">{guesthouse ? `${guesthouse.guesthouse_name}, with its meeting hall inside.` : ''}</p>
            <p className="small muted">College of Science and Technology, Rinchending, Phuentsholing.</p>
          </div>
        </div>
      </section>
    </>
  );
}
