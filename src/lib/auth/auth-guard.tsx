import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth-context';

function canAccessByPageRoutes(pageRoutes: string[], pathname: string): boolean {
  if (pathname === '/') return true;
  return pageRoutes.some(route => {
    // Match both /projects and /dashboard/projects formats
    const normalizedRoute = route.replace('/dashboard', '');
    return pathname === route || pathname.startsWith(route + '/')
      || pathname === normalizedRoute || pathname.startsWith(normalizedRoute + '/');
  });
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, isAdmin, pageRoutes } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Only platform admins (SUPER_ADMIN, OPERATOR) go to /admin
  const isPlatformAdmin = user?.platformRole === 'SUPER_ADMIN' || user?.platformRole === 'OPERATOR';
  if (isPlatformAdmin && !location.pathname.startsWith('/admin')) {
    return <Navigate to="/admin" replace />;
  }

  // Non-admin: block unauthorized routes
  if (user && !isAdmin && !canAccessByPageRoutes(pageRoutes, location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
