import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth-context';
import { canAccessRoute } from './role-guard';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, isAdmin } = useAuth();
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
    // Check role-based route access and redirect unauthorized users to home
    if (!isLoading && isAuthenticated && user && !isAdmin) {
      if (!canAccessRoute(user.role, location.pathname)) {
        navigate('/', { replace: true });
      }
    }
  }, [isLoading, isAuthenticated, isAdmin, user, navigate, location]);

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

  // Block access to unauthorized routes
  if (user && !isAdmin && !canAccessRoute(user.role, location.pathname)) {
    return null;
  }

  return <>{children}</>;
}
