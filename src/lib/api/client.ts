const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_URL}/vendor/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.accessToken && data.refreshToken) {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      return data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('accessToken');

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (response.status === 401 && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login')) {
    // Deduplicate concurrent refresh calls — all 401s share the same promise
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }

    const newToken = await refreshPromise;

    if (newToken) {
      // Retry with the new token (strip any old Authorization from options.headers)
      const { Authorization: _, ...restHeaders } = (options.headers || {}) as Record<string, string>;
      const retryResponse = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newToken}`,
          ...restHeaders,
        },
      });

      if (!retryResponse.ok) {
        const error = await retryResponse.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || 'Request failed');
      }

      if (retryResponse.status === 204 || retryResponse.headers.get('content-length') === '0') {
        return {} as T;
      }

      return retryResponse.json();
    }

    // Refresh failed - clear tokens and redirect to login
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {} as T;
  }

  return response.json();
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
