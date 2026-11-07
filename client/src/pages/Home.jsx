// Landing page: the guest house in photos, its facilities, the room charges and the house rules,
// with links to see rooms, the meeting hall and the floor map without signing in.
import { Link, Navigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth, homeFor } from '../context/AuthContext.jsx';
import { money, useLoad } from '../components/ui.jsx';
import { Gallery, Photo } from '../components/Photo.jsx';
import { FACILITIES, GUEST_HOUSE_PHOTOS, HERO_PHOTO, photoUrl } from '../photos.js';

// From the "Guest House Regulations" notice in the guest house.
const HOUSE_RULES = [
  ['Check-in', '8 am to 10:30 pm. Tell the reception in advance if your arrival changes. Show your ID when you check in.'],
  ['Check-out', '12 noon. Ask the reception if you want to keep the room longer; an extension depends on availability.'],
  ['Changes and cancellations', 'Tell the guest house between 8 am and 10:30 pm. Without notice, the booking may be cancelled.'],
  ['Damage', 'Guests are responsible for any loss or damage they, or people with them, cause to the guest house.'],
  ['Before you go out', 'Switch off fans, lights, air-conditioners and the geyser, and lock your room.'],
];

export default function Home() {
  const { user, loading } = useAuth();
  const { data } = useLoad(async () => {
    const [gh, rates, halls] = await Promise.all([api.get('/guesthouses'), api.get('/rates'), api.get('/halls')]);
    return { guesthouses: gh.guesthouses, rates: rates.rates, halls: halls.halls };
  });

  if (!loading && user) return <Navigate to={homeFor(user)} replace />;

  const rate = (cat, type) => data?.rates.find((r) => r.guest_category === cat && r.charge_type === type)?.rate;
  const hall = data?.halls?.[0];

  return (
    <>
      <section
        className="hero-photo"
        style={{ backgroundImage: `linear-gradient(100deg, rgba(0,27,97,0.92) 0%, rgba(0,39,137,0.72) 45%, rgba(0,39,137,0.15) 100%), url(${photoUrl(HERO_PHOTO.file)})` }}
        aria-label={HERO_PHOTO.label}
      >
        <div className="hero-inner">
          <div className="eyebrow">College of Science and Technology · Rinchending, Phuentsholing</div>
          <h1>Stay at the CST guest house</h1>
          <p>
            Eight 3-bed rooms and a conference hall on campus, plus two suites for college VIP guests. See free beds, prices and the
            floor map with no account; sign in to book and get the answer by email.
          </p>
          <div className="actions">
            <Link className="btn accent" to="/rooms">See rooms and free beds</Link>
            <Link className="btn ghost" to="/hall">Meeting hall</Link>
            <Link className="btn ghost" to="/floor-map">Floor map</Link>
          </div>
          <p className="small hero-signin">
            Want to book? <Link to="/register">Create an account</Link> or <Link to="/login">sign in</Link>.
          </p>
        </div>
        <ul className="hero-facts">
          <li><strong>8 rooms</strong><span>3 beds each</span></li>
          <li><strong>{hall ? `${hall.capacity}-seat` : '25-seat'}</strong><span>conference hall</span></li>
          <li><strong>8 am – 10:30 pm</strong><span>check-in</span></li>
          <li><strong>12 noon</strong><span>check-out</span></li>
        </ul>
      </section>

      <section className="section">
        <div className="eyebrow">The building</div>
        <h2>The guest house</h2>
        <Gallery photos={GUEST_HOUSE_PHOTOS} />
      </section>

      <section className="band">
        <div className="eyebrow">Inside</div>
        <h2 style={{ marginTop: 0 }}>Facilities</h2>
        <div className="facilities">
          {FACILITIES.map((f) => (
            <article className="facility" key={f.file}>
              <Photo photo={f} />
              <div className="facility-body">
                <h3>{f.label}</h3>
                <p className="small">{f.text}</p>
                {f.to && <Link className="small" to={f.to}>{f.to === '/hall' ? 'See free days' : 'See rooms'}</Link>}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="eyebrow">Prices</div>
        <h2>Room charges per night</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Guest</th><th>One bed</th><th>Whole room (exclusive)</th></tr></thead>
            <tbody>
              {['RUB', 'Non-RUB'].map((c) => (
                <tr key={c}><td>{c === 'RUB' ? 'RUB member' : 'Non-RUB'}</td><td>{money(rate(c, 'Per Bed'))}</td><td>{money(rate(c, 'Exclusive Room'))}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small" style={{ marginTop: '0.5rem' }}>
          RUB = Royal University of Bhutan staff; everyone else pays the Non-RUB rate. Staff ID will be verified during check-in and check-out for RUB members. 5% GST is added to every bill.
          The meeting hall inside the guest house is {hall ? money(hall.price_per_day) : 'Nu. 5,000.00'} per day plus GST.
        </p>
        <div className="grid" style={{ marginTop: '1rem' }}>
          {(data?.guesthouses || []).map((g) => (
            <div className="panel" key={g.guesthouse_id}>
              <h3>{g.guesthouse_name}</h3>
              <p className="muted small">{g.location}</p>
              <p>{g.description}</p>
              <p className="small">{g.room_count} rooms, {g.bed_count} beds</p>
              <div className="actions"><Link className="btn small" to="/rooms">See free beds</Link><Link className="btn small secondary" to="/floor-map">Floor map</Link></div>
            </div>
          ))}
        </div>
      </section>

      <section className="band gray rules">
        <div className="eyebrow">Please read before you stay</div>
        <h2 style={{ marginTop: 0 }}>Guest house regulations</h2>
        <dl className="rules-list">
          {HOUSE_RULES.map(([t, d]) => (
            <div key={t}><dt>{t}</dt><dd>{d}</dd></div>
          ))}
        </dl>
        <p className="small muted">Questions about a booking: the Administrative Officer, phone 17160538.</p>
      </section>
    </>
  );
}
