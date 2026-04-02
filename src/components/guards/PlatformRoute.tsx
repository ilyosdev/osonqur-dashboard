import { Navigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth/auth-context';

export function PlatformRoute({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Check both platformRole (new) and role (legacy) for compatibility
  const userRole = user?.platformRole || user?.role || '';
  if (!roles.includes(userRole)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
