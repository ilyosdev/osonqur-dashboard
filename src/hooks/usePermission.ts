import { useAuth } from '../lib/auth/auth-context';

export function usePermission(permission: string): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}
