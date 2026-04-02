import { Navigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth/auth-context';

export function PlatformRoute({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user?.platformRole || !roles.includes(user.platformRole)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
