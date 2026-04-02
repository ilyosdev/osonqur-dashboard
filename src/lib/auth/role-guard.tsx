import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './auth-context';

// Role hierarchy - SUPER_ADMIN has full access, others are isolated
const ROLE_HIERARCHY: Record<string, string[]> = {
  SUPER_ADMIN: ['SUPER_ADMIN', 'OPERATOR', 'DIREKTOR', 'BOSS', 'BUGALTERIYA', 'PTO', 'SNABJENIYA', 'SKLAD', 'PRORAB', 'HAYDOVCHI', 'MODERATOR', 'WORKER', 'POSTAVSHIK'],
  OPERATOR: ['OPERATOR'],
  // All other roles are isolated - no inheritance
  DIREKTOR: ['DIREKTOR'],
  BOSS: ['BOSS'],
  PRORAB: ['PRORAB'],
  SNABJENIYA: ['SNABJENIYA'],
  SKLAD: ['SKLAD'],
  BUGALTERIYA: ['BUGALTERIYA'],
  PTO: ['PTO'],
  HAYDOVCHI: ['HAYDOVCHI'],
  MODERATOR: ['MODERATOR'],
  WORKER: ['WORKER'],
  POSTAVSHIK: ['POSTAVSHIK'],
};

export function hasRole(userRole: string | undefined, allowedRoles: string[]): boolean {
  if (!userRole) return false;

  // Check if user's role is in allowed roles
  if (allowedRoles.includes(userRole)) return true;

  // Check role hierarchy - only SUPER_ADMIN inherits all roles now
  const inheritedRoles = ROLE_HIERARCHY[userRole] || [];
  return allowedRoles.some(role => inheritedRoles.includes(role));
}

export function canAccessRoute(userRole: string | undefined, pathname: string): boolean {
  if (!userRole) return false;

  // Role-specific routes (matching bot structure - each role isolated)
  const routeRoles: Record<string, string[]> = {
    // Admin routes
    '/admin/operators': ['SUPER_ADMIN'],
    '/admin': ['SUPER_ADMIN', 'OPERATOR'],

    // DIREKTOR only pages
    '/direktor': ['DIREKTOR'],
    '/requests': ['DIREKTOR'],
    '/users': ['DIREKTOR'],
    // Shared validation (DIREKTOR + PTO + BOSS)
    '/validation': ['DIREKTOR', 'PTO', 'BOSS'],

    // BOSS pages
    '/reports': ['BOSS', 'DIREKTOR'],
    '/settings': ['DIREKTOR', 'BOSS'],

    // Finance - BUGALTERIYA + leadership
    '/finance': ['BUGALTERIYA', 'BOSS', 'DIREKTOR'],
    '/workers': ['BUGALTERIYA'],

    // SNABJENIYA pages
    '/supply': ['SNABJENIYA'],
    '/suppliers': ['SNABJENIYA'],

    // Warehouse - SKLAD + leadership
    '/warehouse': ['SKLAD', 'BOSS', 'DIREKTOR'],

    // PRORAB pages
    '/foreman': ['PRORAB'],

    // PTO pages
    '/smeta-comparison': ['PTO'],

    // Kassa - all operational roles (not BOSS)
    '/kassa': ['BOSS', 'DIREKTOR', 'BUGALTERIYA', 'SNABJENIYA', 'SKLAD', 'PRORAB', 'PTO', 'HAYDOVCHI', 'MODERATOR'],

    // Portal roles
    '/driver': ['HAYDOVCHI'],
    '/moderator': ['MODERATOR'],
    '/worker-portal': ['WORKER'],
    '/supplier-portal': ['POSTAVSHIK'],

    // Projects - limited access
    '/projects': ['DIREKTOR', 'BOSS', 'BUGALTERIYA', 'PTO', 'SNABJENIYA', 'SKLAD', 'PRORAB'],
  };

  // Check if route has restrictions (match longest prefix first)
  const sortedRoutes = Object.keys(routeRoles).sort((a, b) => b.length - a.length);
  const matchedRoute = sortedRoutes.find(route => pathname.startsWith(route));

  // If no restrictions, allow access (home page "/" is accessible to all)
  if (!matchedRoute) return true;

  const allowedRoles = routeRoles[matchedRoute];
  return hasRole(userRole, allowedRoles);
}

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function RoleGuard({
  children,
  allowedRoles,
  fallback,
  redirectTo = '/'
}: RoleGuardProps) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  const hasAccess = hasRole(user?.role, allowedRoles);

  useEffect(() => {
    if (!isLoading && !hasAccess && redirectTo) {
      navigate(redirectTo, { replace: true });
    }
  }, [isLoading, hasAccess, redirectTo, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return null;
  }

  return <>{children}</>;
}

// Hook to check role access
export function useRoleAccess(allowedRoles: string[]): boolean {
  const { user } = useAuth();
  return hasRole(user?.role, allowedRoles);
}

// Component to conditionally render based on role
interface RoleVisibleProps {
  children: React.ReactNode;
  roles: string[];
  fallback?: React.ReactNode;
}

export function RoleVisible({ children, roles, fallback = null }: RoleVisibleProps) {
  const hasAccess = useRoleAccess(roles);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
