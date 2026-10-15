// Landing page: what G-Link is, guest houses, and the bed-wise rates.
import { Link, Navigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth, homeFor } from '../context/AuthContext.jsx';
import { KeyTag, money, useLoad } from '../components/ui.jsx';

export default function Home() {
  const { user, loading } = useAuth();
  const { data } = useLoad(async () => {
    const [gh, rates] = await Promise.all([api.get('/guesthouses'), api.get('/rates')]);
    return { guesthouses: gh.guesthouses, rates: rates.rates };
  });

  if (!loading && user) return <Navigate to={homeFor(user)} replace />;

  const rate = (cat, type) => data?.rates.find((r) => r.guest_category === cat && r.charge_type === type)?.rate;

  return (
    <>
      <section className="hero">
        <div>
          <h1>Book a bed or a room at the CST guest house</h1>
          <p className="muted">
            See which beds are free for your dates, the charge per bed, and book online.
            The admin reviews every request and you get the answer by email.
          </p>
          <div className="actions">
            <Link className="btn" to="/register">Create an account</Link>
            <Link className="btn secondary" to="/login">Sign in</Link>
          </div>
        </div>
        <div className="hero-tags" aria-hidden="true">
          <KeyTag number="101" />
          <KeyTag number="102" />
          <KeyTag number="103" />
        </div>
      </section>

      <h2>Room charges per night</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Guest</th><th>One bed</th><th>Whole room (exclusive)</th></tr></thead>
          <tbody>
            {['RUB staff', 'Other national'].map((c) => (
              <tr key={c}><td>{c}</td><td>{money(rate(c, 'Per Bed'))}</td><td>{money(rate(c, 'Exclusive Room'))}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small" style={{ marginTop: '0.5rem' }}>
        5% GST is added to every bill. Rooms have 3 beds. The meeting hall (25 seats) is Nu. 5,000 per day plus GST.
      </p>

      <h2>Guest houses</h2>
      <div className="grid">
        {(data?.guesthouses || []).map((g) => (
          <div className="panel" key={g.guesthouse_id}>
            <h3>{g.guesthouse_name}</h3>
            <p className="muted small">{g.location}</p>
            <p>{g.description}</p>
            <p className="small">{g.room_count} rooms, {g.bed_count} beds</p>
          </div>
        ))}
      </div>
    </>
  );
}
