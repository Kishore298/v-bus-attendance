import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

export function ProtectedRoute({ children }) {
  const { token, user } = useSelector((s) => s.auth);
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export function RoleRoute({ allowedRoles, children }) {
  const { user } = useSelector((s) => s.auth);
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
