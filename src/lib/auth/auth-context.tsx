import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAccessToken, getRefreshToken, setTokens, clearTokens, isTokenExpired } from './tokens';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';

interface User {
  id: string;
  name: string;
  phone: string;
  role: string;
  allowedRoles?: string[];
  orgId: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  currentRole: string | null;
  allowedRoles: string[];
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  switchRole: (role: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        return;
      }

      const expired = isTokenExpired(token);

      if (expired) {
        token = await refreshToken();
        if (!token) {
          clearTokens();
          setUser(null);
          return;
        }
      }

      const userData = await fetchUserProfile(token);
      setUser(userData);
    } catch {
      clearTokens();
      setUser(null);
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
  };

  const refreshAuth = async () => {
    await loadUser();
  };

  const switchRole = async (role: string) => {
    const token = getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/vendor/auth/switch-role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ role }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to switch role' }));
      throw new Error(error.message || 'Failed to switch role');
    }

    const data = await response.json();
    const tokens = data.tokens;

    if (tokens?.accessToken && tokens?.refreshToken) {
      setTokens(tokens.accessToken, tokens.refreshToken);
    }

    if (data.user) {
      setUser(data.user);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const isAdmin = !!user && (user.role === 'SUPER_ADMIN' || user.role === 'OPERATOR' || user.role === 'ADMIN');
  const currentRole = user?.role ?? null;
  const allowedRoles = user?.allowedRoles ?? (user?.role ? [user.role] : []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin,
    currentRole,
    allowedRoles,
    login,
    logout,
    refreshAuth,
    switchRole,
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
