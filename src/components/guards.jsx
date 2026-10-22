import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Guest pages: must be signed in as an in-house guest. Keeps ?room= / ?desk= from the QR code. */
export function RequireGuest({ children }) {
  const { guest, visitor } = useAuth();
  const { search } = useLocation();
  if (!guest && !visitor) return <Navigate to={{ pathname: '/login', search }} replace />;
  return children;
}

/** Staff pages: must be signed in with one of the allowed roles. */
export function RequireStaff({ roles, children }) {
  const { staff } = useAuth();
  if (!staff) return <Navigate to="/staff/login" replace />;
  if (!roles.includes(staff.role)) {
    return <Navigate to={staff.role === 'admin' ? '/admin' : '/staff/dashboard'} replace />;
  }
  return children;
}
