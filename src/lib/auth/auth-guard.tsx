import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth-context';

function canAccessByPageRoutes(pageRoutes: string[], pathname: string): boolean {
  // Home page is always accessible
  if (pathname === '/') return true;
  // Check if any pageRoute is a prefix of the current pathname
  return pageRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, isAdmin, pageRoutes } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { state: { from: location }, replace: true });
    }
    // Redirect admin users to /admin if they try to access vendor routes
    if (!isLoading && isAuthenticated && isAdmin && !location.pathname.startsWith('/admin')) {
      navigate('/admin', { replace: true });
    }
    // Check permission-based route access and redirect unauthorized users to home
    if (!isLoading && isAuthenticated && user && !isAdmin) {
      if (!canAccessByPageRoutes(pageRoutes, location.pathname)) {
        navigate('/', { replace: true });
      }
    }
  }, [isLoading, isAuthenticated, isAdmin, user, pageRoutes, navigate, location]);

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
    return null;
  }

  // Block admin users from rendering vendor pages (redirect happens in useEffect)
  if (isAdmin && !location.pathname.startsWith('/admin')) {
    return null;
  }

  // Block access to unauthorized routes
  if (user && !isAdmin && !canAccessByPageRoutes(pageRoutes, location.pathname)) {
    return null;
  }

  return <>{children}</>;
}
