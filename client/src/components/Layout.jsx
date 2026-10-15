// Top bar with the menu for each role, and the page area.
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const MENUS = {
  Guest: [
    ['/rooms', 'Find a room'],
    ['/hall', 'Meeting hall'],
    ['/my-bookings', 'My bookings'],
    ['/profile', 'Profile'],
  ],
  Incharge: [
    ['/incharge', 'Check-in / out'],
    ['/profile', 'Profile'],
  ],
  Admin: [
    ['/admin', 'Dashboard'],
    ['/admin/bookings', 'Bookings'],
    ['/admin/extensions', 'Extensions'],
    ['/admin/halls', 'Hall'],
    ['/admin/international', 'International guest'],
    ['/admin/rooms', 'Rooms'],
    ['/admin/blocks', 'Blocks'],
    ['/admin/rates', 'Rates'],
    ['/admin/payments', 'Payments'],
    ['/incharge', 'Check-in / out'],
  ],
};
MENUS['Super Admin'] = [['/superadmin/users', 'Users'], ...MENUS.Admin];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const menu = user ? MENUS[user.role] || [] : [['/', 'Home']];

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/" className="brand">G-Link <small>CST Guest House</small></NavLink>
          <nav className="nav" aria-label="Main">
            {menu.map(([to, label]) => (
              <NavLink key={to} to={to} end={to === '/admin' || to === '/'}>{label}</NavLink>
            ))}
          </nav>
          <div className="usermenu">
            {user ? (
              <>
                <span>{user.first_name} <span className="role">({user.role})</span></span>
                {user.role !== 'Guest' && <NavLink to="/profile" style={{ color: '#fff' }}>Profile</NavLink>}
                <button onClick={() => { logout(); navigate('/'); }}>Sign out</button>
              </>
            ) : (
              <>
                <NavLink to="/login" style={{ color: '#fff' }}>Sign in</NavLink>
                <NavLink to="/register" className="btn secondary small">Sign up</NavLink>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}
