// Admin start page: what needs attention today.
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { Notice, money, useLoad } from '../../components/ui.jsx';

export default function AdminDashboard() {
  const { data, error } = useLoad(() => api.get('/admin/dashboard'));
  const tiles = data ? [
    ['/admin/bookings', data.pending_bookings, 'Room bookings waiting for review'],
    ['/admin/extensions', data.pending_extensions, 'Stay extensions waiting'],
    ['/admin/halls', data.pending_hall_bookings, 'Hall bookings waiting'],
    ['/incharge', data.arrivals_today, 'Guests arriving today'],
    ['/incharge', data.in_house, 'Guests in the guest house now'],
    ['/admin/blocks', data.active_blocks, 'Active room blocks'],
    ['/admin/payments', data.unpaid.n, `Unpaid bills (${money(data.unpaid.total)})`],
    ['/admin/rooms', data.rooms.n, `Rooms (${data.rooms.beds} beds)`],
  ] : [];

  return (
    <>
      <div className="page-head"><div><h1>Dashboard</h1><p>Requests waiting for you and today at the guest house.</p></div></div>
      <Notice type="error">{error}</Notice>
      <div className="grid">
        {tiles.map(([to, n, label]) => (
          <Link key={label} to={to} className="panel stat"><strong>{n}</strong>{label}</Link>
        ))}
      </div>
    </>
  );
}
