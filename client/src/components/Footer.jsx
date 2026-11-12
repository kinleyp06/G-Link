// Footer on every page: who we are, how to contact the guest house, and a Google Map of where it is.
import { Link } from 'react-router-dom';
import { SITE_INFO as S } from '../siteInfo.js';

const mapEmbed = `https://www.google.com/maps?q=${encodeURIComponent(S.mapQuery)}&z=17&output=embed`;
const mapLink = S.mapLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(S.mapQuery)}`;

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <section className="footer-brand">
          <div className="footer-logo">
            <img src="/logo.png" alt="" />
            <div>
              <strong>G-Link</strong>
              <span>{S.name}</span>
            </div>
          </div>
          <p>Rooms and the conference hall of the {S.college}, {S.university}.</p>
          <nav className="footer-links" aria-label="Footer">
            <Link to="/rooms">Rooms</Link>
            <Link to="/hall">Meeting hall</Link>
            <Link to="/floor-map">Floor map</Link>
          </nav>
        </section>

        <section>
          <h2>Contact us</h2>
          <address>
            {S.address.map((line) => <span key={line}>{line}</span>)}
          </address>
          <p>
            <span className="footer-label">{S.bookingContact.label}</span>
            <a href={`tel:+975${S.bookingContact.phone}`}>{S.bookingContact.phone}</a>
          </p>
          <p className="footer-hours">{S.hours}</p>
          <p><a href={S.website} target="_blank" rel="noreferrer">{S.website.replace('https://', '')}</a></p>
        </section>

        <section className="footer-map">
          <h2>Find us</h2>
          <iframe
            title="Map showing the CST guest house in Rinchending, Phuentsholing"
            src={mapEmbed}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
          <a className="footer-maplink" href={mapLink} target="_blank" rel="noreferrer">Open in Google Maps</a>
        </section>
      </div>
      <div className="footer-bottom">
        © {new Date().getFullYear()} {S.college}, {S.university}. G-Link guest house booking system.
      </div>
    </footer>
  );
}
