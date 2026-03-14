import { apiClient, PaginationParams, PaginatedResponse } from './client';

export type SmetaItemType = 'WORK' | 'MACHINE' | 'MATERIAL' | 'OTHER';
export type DataSource = 'DASHBOARD' | 'TELEGRAM';

export interface SmetaItem {
  id: string;
  smetaId: string;
  itemType: SmetaItemType;
  category: string;
  code?: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  usedQuantity: number;
  usedAmount: number;
  percentRate?: number;
  machineType?: string;
  laborHours?: number;
  updatedBy?: string;
  source: DataSource;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSmetaItemRequest {
  smetaId: string;
  itemType?: SmetaItemType;
  category: string;
  code?: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  percentRate?: number;
  machineType?: string;
  laborHours?: number;
}

export interface UpdateSmetaItemRequest {
  itemType?: SmetaItemType;
  category?: string;
  code?: string;
  name?: string;
  unit?: string;
  quantity?: number;
  unitPrice?: number;
  usedQuantity?: number;
  usedAmount?: number;
  percentRate?: number;
  machineType?: string;
  laborHours?: number;
}

export interface GetSmetaItemsParams extends PaginationParams {
  smetaId?: string;
  itemType?: SmetaItemType;
  category?: string;
  search?: string;
}

export const smetaItemsApi = {
  getAll: (params?: GetSmetaItemsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.smetaId) searchParams.append('smetaId', params.smetaId);
    if (params?.itemType) searchParams.append('itemType', params.itemType);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.search) searchParams.append('search', params.search);

    const query = searchParams.toString();
    return apiClient<PaginatedResponse<SmetaItem>>(
      `/vendor/smeta-items${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },

  getById: (id: string) =>
    apiClient<SmetaItem>(`/vendor/smeta-items/${id}`, {
      method: 'GET',
    }),

  create: (data: CreateSmetaItemRequest) =>
    apiClient<SmetaItem>('/vendor/smeta-items', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateSmetaItemRequest) =>
    apiClient<SmetaItem>(`/vendor/smeta-items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiClient<void>(`/vendor/smeta-items/${id}`, {
      method: 'DELETE',
    }),

  // Smeta comparison
  getComparison: (projectId: string) =>
    apiClient<{
      items: Array<{
        id: string;
        name: string;
        unit: string;
        smetaQty: number;
        smetaPrice: number;
        smetaTotal: number;
        usedQty: number;
        actualSpent: number;
        percentUsed: number;
      }>;
      summary: {
        totalBudget: number;
        totalSpent: number;
        savings: number;
        completion: number;
      };
    }>(`/vendor/smeta-items/comparison/${projectId}`, {
      method: 'GET',
    }),
};
