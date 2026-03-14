import { apiClient, PaginationParams, PaginatedResponse } from './client';

export type SmetaType = 'CONSTRUCTION' | 'ELECTRICAL' | 'PLUMBING' | 'HVAC' | 'FINISHING' | 'OTHER';

export interface Smeta {
  id: string;
  name: string;
  projectId: string;
  projectName?: string;
  type: SmetaType;
  description?: string;
  budget: number;
  deadline?: string;
  currentVersion: number;
  totalWorkAmount: number;
  totalMachineAmount: number;
  totalMaterialAmount: number;
  totalOtherAmount: number;
  grandTotal: number;
  overheadPercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSmetaRequest {
  name: string;
  projectId: string;
  type?: SmetaType;
  description?: string;
  budget?: number;
  deadline?: string;
  overheadPercent?: number;
}

export interface UpdateSmetaRequest {
  name?: string;
  type?: SmetaType;
  description?: string;
  budget?: number;
  deadline?: string;
  overheadPercent?: number;
}

export interface GetSmetasParams extends PaginationParams {
  projectId?: string;
  type?: SmetaType;
  search?: string;
}

export const smetasApi = {
  getAll: (params?: GetSmetasParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.projectId) searchParams.append('projectId', params.projectId);
    if (params?.type) searchParams.append('type', params.type);
    if (params?.search) searchParams.append('search', params.search);
    
    const query = searchParams.toString();
    return apiClient<PaginatedResponse<Smeta>>(
      `/vendor/smetas${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },

  getById: (id: string) =>
    apiClient<Smeta>(`/vendor/smetas/${id}`, {
      method: 'GET',
    }),

  create: (data: CreateSmetaRequest) =>
    apiClient<Smeta>('/vendor/smetas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateSmetaRequest) =>
    apiClient<Smeta>(`/vendor/smetas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiClient<void>(`/vendor/smetas/${id}`, {
      method: 'DELETE',
    }),
};
