import { Navigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth/auth-context';

export function PermissionRoute({ permission, children }: { permission: string; children: React.ReactNode }) {
  const { hasPermission, isLoading } = useAuth();
  if (isLoading) return null;
  if (!hasPermission(permission)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
