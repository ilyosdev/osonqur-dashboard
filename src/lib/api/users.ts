import { apiClient, PaginationParams, PaginatedResponse } from './client';

export interface User {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  telegramId?: string;
  role: string;
  allowedRoles?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  name: string;
  phone?: string;
  email?: string;
  password?: string;
  telegramId?: string;
  role?: string;
  allowedRoles?: string[];
}

export interface UpdateUserRequest {
  name?: string;
  phone?: string;
  email?: string;
  role?: string;
  allowedRoles?: string[];
  isActive?: boolean;
}

export interface GetUsersParams extends PaginationParams {
  role?: string;
  isActive?: boolean;
  search?: string;
}

export const usersApi = {
  getAll: (params?: GetUsersParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.role) searchParams.append('role', params.role);
    if (params?.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());
    if (params?.search) searchParams.append('search', params.search);

    const query = searchParams.toString();
    return apiClient<PaginatedResponse<User>>(
      `/vendor/users${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },

  getById: (id: string) =>
    apiClient<User>(`/vendor/users/${id}`, {
      method: 'GET',
    }),

  create: (data: CreateUserRequest) =>
    apiClient<User>('/vendor/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateUserRequest) =>
    apiClient<User>(`/vendor/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiClient<void>(`/vendor/users/${id}`, {
      method: 'DELETE',
    }),
};
