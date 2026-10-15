// Only lets signed-in users with an allowed role open a page.
// Super Admin has full access, so it can open every page.
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="muted">Loading...</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && user.role !== 'Super Admin' && !roles.includes(user.role)) {
    return <div className="notice error">You do not have permission to open this page.</div>;
  }
  return <Outlet />;
}
