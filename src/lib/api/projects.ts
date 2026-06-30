import { apiClient, PaginationParams, PaginatedResponse } from './client';

export interface Project {
  id: string;
  name: string;
  address?: string;
  description?: string;
  budget?: number;
  status: string;
  floors?: number;
  buildingsCount?: number;
  startDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  address?: string;
  description?: string;
  budget?: number;
  status?: string;
  floors?: number;
  buildingsCount?: number;
  startDate?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  address?: string;
  description?: string;
  budget?: number;
  status?: string;
  floors?: number;
  buildingsCount?: number;
  startDate?: string;
}

export interface GetProjectsParams extends PaginationParams {
  status?: string;
  search?: string;
}

export const projectsApi = {
  getAll: (params?: GetProjectsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.search) searchParams.append('search', params.search);

    const query = searchParams.toString();
    return apiClient<PaginatedResponse<Project>>(
      `/vendor/projects${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },

  getById: (id: string) =>
    apiClient<Project>(`/vendor/projects/${id}`, {
      method: 'GET',
    }),

  create: (data: CreateProjectRequest) =>
    apiClient<Project>('/vendor/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateProjectRequest) =>
    apiClient<Project>(`/vendor/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiClient<void>(`/vendor/projects/${id}`, {
      method: 'DELETE',
    }),
};
