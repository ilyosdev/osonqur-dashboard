import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { getAccessToken, getRefreshToken, setTokens, clearTokens, isTokenExpired } from './tokens';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';

interface User {
  id: string;
  name: string;
  phone: string;
  role: string;
  platformRole?: string;
  orgRoleId?: string;
  orgId: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  permissions: string[];
  pageRoutes: string[];
  hasPermission: (key: string) => boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [pageRoutes, setPageRoutes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const permissionsRefreshRef = useRef<Promise<void> | null>(null);

  const fetchUserProfile = async (token: string): Promise<User> => {
    const response = await fetch(`${API_URL}/vendor/auth/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const data = await response.json();
    return data.user || data;
  };

  /**
   * Fetch permissions from /vendor/auth/me.
   * Returns { permissions: string[], pageRoutes: string[], user? }
   */
  const fetchPermissions = useCallback(async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/vendor/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Non-fatal: keep old permissions, log warning
        console.warn('Failed to fetch permissions from /auth/me:', response.status);
        return;
      }

      const data = await response.json();
      if (Array.isArray(data.permissions)) {
        setPermissions(data.permissions);
      }
      if (Array.isArray(data.pageRoutes)) {
        setPageRoutes(data.pageRoutes);
      }
      // If /auth/me returns updated user fields, merge them
      if (data.user) {
        setUser(prev => prev ? { ...prev, ...data.user } : data.user);
      }
    } catch (err) {
      console.warn('Error fetching permissions:', err);
    }
  }, []);

  /**
   * Refresh permissions (deduplicated -- concurrent calls share one promise).
   * Called automatically on 403 responses.
   */
  const refreshPermissions = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;

    if (!permissionsRefreshRef.current) {
      permissionsRefreshRef.current = fetchPermissions(token).finally(() => {
        permissionsRefreshRef.current = null;
      });
    }
    return permissionsRefreshRef.current;
  }, [fetchPermissions]);

  const refreshToken = async (): Promise<string | null> => {
    const refresh = getRefreshToken();
    if (!refresh) return null;

    try {
      const response = await fetch(`${API_URL}/vendor/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: refresh }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (data.accessToken && data.refreshToken) {
        setTokens(data.accessToken, data.refreshToken);
        return data.accessToken;
      }

      return null;
    } catch {
      return null;
    }
  };

  const loadUser = async () => {
    setIsLoading(true);
    try {
      let token = getAccessToken();

      if (!token) {
        setUser(null);
        setPermissions([]);
        setPageRoutes([]);
        return;
      }

      const expired = isTokenExpired(token);

      if (expired) {
        token = await refreshToken();
        if (!token) {
          clearTokens();
          setUser(null);
          setPermissions([]);
          setPageRoutes([]);
          return;
        }
      }

      // Fetch profile and permissions in parallel
      const [userData] = await Promise.all([
        fetchUserProfile(token),
        fetchPermissions(token),
      ]);
      setUser(userData);
    } catch {
      clearTokens();
      setUser(null);
      setPermissions([]);
      setPageRoutes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (phone: string, password: string) => {
    const response = await fetch(`${API_URL}/vendor/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ login: phone, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    const tokens = data.tokens || data;

    if (!tokens.accessToken || !tokens.refreshToken) {
      throw new Error('Invalid response from server');
    }

    setTokens(tokens.accessToken, tokens.refreshToken);

    // Fetch permissions immediately after login
    await fetchPermissions(tokens.accessToken);

    if (data.user) {
      setUser(data.user);
    } else {
      const userData = await fetchUserProfile(tokens.accessToken);
      setUser(userData);
    }
  };

  const logout = () => {
    clearTokens();
    setUser(null);
    setPermissions([]);
    setPageRoutes([]);
  };

  const refreshAuth = async () => {
    await loadUser();
  };

  const hasPermission = useCallback((key: string): boolean => {
    return permissions.includes(key);
  }, [permissions]);

  // Listen for 403 responses globally to auto-refresh permissions.
  // We patch window.fetch once, on mount.
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const response = await originalFetch(...args);
      if (response.status === 403) {
        // Auto-refresh permissions on 403 (fire-and-forget)
        refreshPermissions();
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [refreshPermissions]);

  useEffect(() => {
    loadUser();
  }, []);

  const isAdmin = !!user && (user.role === 'SUPER_ADMIN' || user.role === 'OPERATOR' || user.role === 'ADMIN');

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin,
    permissions,
    pageRoutes,
    hasPermission,
    login,
    logout,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
