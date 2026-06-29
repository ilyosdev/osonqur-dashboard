import { apiClient, PaginationParams, PaginatedResponse } from './client';

export interface Warehouse {
  id: string;
  name: string;
  location?: string;
  vendorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarehouseRequest {
  name: string;
  location?: string;
}

export interface GetWarehousesParams extends PaginationParams {
  search?: string;
}

export interface WarehouseItem {
  id: string;
  warehouseId: string;
  smetaItemId: string;
  quantity: number;
  vendorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarehouseItemRequest {
  warehouseId: string;
  smetaItemId: string;
  quantity: number;
}

export interface WarehouseTransfer {
  id: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  smetaItemId: string;
  quantity: number;
  transferDate: string;
  status: string;
  vendorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarehouseTransferRequest {
  fromWarehouseId: string;
  toWarehouseId: string;
  smetaItemId: string;
  quantity: number;
  transferDate: string;
}

export interface UpdateWarehouseRequest {
  name?: string;
  location?: string;
}

export interface UpdateWarehouseItemRequest {
  quantity?: number;
}

export interface GetWarehouseItemsParams extends PaginationParams {
  smetaItemId?: string;
}

export interface GetWarehouseTransfersParams extends PaginationParams {
  warehouseId?: string;
  status?: string;
}

export const warehousesApi = {
  // Warehouse CRUD
  getAll: (params?: GetWarehousesParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    
    const query = searchParams.toString();
    return apiClient<PaginatedResponse<Warehouse>>(
      `/vendor/warehouses${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },

  getById: (id: string) =>
    apiClient<Warehouse>(`/vendor/warehouses/${id}`, {
      method: 'GET',
    }),

  create: (data: CreateWarehouseRequest) =>
    apiClient<Warehouse>('/vendor/warehouses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateWarehouseRequest) =>
    apiClient<Warehouse>(`/vendor/warehouses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiClient<void>(`/vendor/warehouses/${id}`, {
      method: 'DELETE',
    }),

  // Warehouse Items
  getItems: (warehouseId: string, params?: GetWarehouseItemsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.smetaItemId) searchParams.append('smetaItemId', params.smetaItemId);
    
    const query = searchParams.toString();
    return apiClient<PaginatedResponse<WarehouseItem>>(
      `/vendor/warehouses/${warehouseId}/items${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },

  createItem: (data: CreateWarehouseItemRequest) =>
    apiClient<WarehouseItem>('/vendor/warehouses/items', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateItem: (id: string, data: UpdateWarehouseItemRequest) =>
    apiClient<WarehouseItem>(`/vendor/warehouses/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteItem: (id: string) =>
    apiClient<void>(`/vendor/warehouses/items/${id}`, {
      method: 'DELETE',
    }),

  // Warehouse Transfers
  getTransfers: (params?: GetWarehouseTransfersParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.warehouseId) searchParams.append('warehouseId', params.warehouseId);
    if (params?.status) searchParams.append('status', params.status);
    
    const query = searchParams.toString();
    return apiClient<PaginatedResponse<WarehouseTransfer>>(
      `/vendor/warehouses/transfers/list${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },

  getTransferById: (id: string) =>
    apiClient<WarehouseTransfer>(`/vendor/warehouses/transfers/${id}`, {
      method: 'GET',
    }),

  createTransfer: (data: CreateWarehouseTransferRequest) =>
    apiClient<WarehouseTransfer>('/vendor/warehouses/transfers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  completeTransfer: (id: string) =>
    apiClient<WarehouseTransfer>(`/vendor/warehouses/transfers/${id}/complete`, {
      method: 'POST',
    }),

  cancelTransfer: (id: string) =>
    apiClient<WarehouseTransfer>(`/vendor/warehouses/transfers/${id}/cancel`, {
      method: 'POST',
    }),

  // Enhanced warehouse operations
  getAllItems: (params?: { warehouseId?: string; search?: string } & PaginationParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.warehouseId) searchParams.append('warehouseId', params.warehouseId);
    if (params?.search) searchParams.append('search', params.search);

    const query = searchParams.toString();
    return apiClient<PaginatedResponse<WarehouseItem>>(
      `/vendor/warehouses/items/all${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },

  addItem: (warehouseId: string, data: { smetaItemId: string; quantity: number; note?: string; photo?: string }) =>
    apiClient<WarehouseItem>(`/vendor/warehouses/${warehouseId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  removeItem: (warehouseId: string, data: { smetaItemId: string; quantity: number; reason: string }) =>
    apiClient<WarehouseItem>(`/vendor/warehouses/${warehouseId}/items/remove`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  transferItem: (data: { fromWarehouseId: string; toWarehouseId: string; smetaItemId: string; quantity: number }) =>
    apiClient<WarehouseTransfer>('/vendor/warehouses/transfers/quick', {
      method: 'POST',
      body: JSON.stringify({ ...data, transferDate: new Date().toISOString() }),
    }),

  receiveDelivery: (requestId: string, data: { receivedQty: number; note?: string; photo?: string }) =>
    apiClient<{ success: boolean }>(`/vendor/warehouses/receive-delivery/${requestId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getLogs: (params?: { projectId?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.projectId) searchParams.append('projectId', params.projectId);
    const query = searchParams.toString();
    return apiClient<{ data: WarehouseLog[]; total: number; page: number; limit: number }>(
      `/vendor/warehouses/logs${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },
};

export interface WarehouseLogItem {
  id: string;
  itemName: string;
  unit: string;
  quantity: number;
  createdBy?: { id: string; name: string };
}

export interface WarehouseLog {
  batchId: string;
  type: 'IN' | 'OUT';
  source: 'MANUAL' | 'REQUEST' | 'TRANSFER';
  createdAt: string;
  items: WarehouseLogItem[];
}
