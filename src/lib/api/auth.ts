import { apiClient } from './client';

export interface LoginRequest {
  login: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    phone: string;
    firstName?: string;
    lastName?: string;
    role: string;
  };
}

export interface RegisterRequest {
  phone: string;
  password: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  phone?: string;
  email?: string;
  name: string;
  role: string;
  orgId: string;
  orgName: string;
  telegramId?: string;
}

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  email?: string;
  telegramId?: string;
  password?: string;
}

export interface Organization {
  id: string;
  name: string;
  phone?: string;
  isActive: boolean;
}

export interface UpdateOrganizationRequest {
  name?: string;
  phone?: string;
}

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient<LoginResponse>('/vendor/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  register: (data: RegisterRequest) =>
    apiClient<LoginResponse>('/vendor/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  refreshToken: (data: RefreshTokenRequest) =>
    apiClient<RefreshTokenResponse>('/vendor/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getProfile: () =>
    apiClient<UserProfile>('/vendor/auth/profile', {
      method: 'GET',
    }),

  updateProfile: (userId: string, data: UpdateProfileRequest) =>
    apiClient<UserProfile>(`/vendor/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getOrganization: (orgId: string) =>
    apiClient<Organization>(`/vendor/organizations/${orgId}`, {
      method: 'GET',
    }),

  updateOrganization: (orgId: string, data: UpdateOrganizationRequest) =>
    apiClient<Organization>(`/vendor/organizations/${orgId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};
