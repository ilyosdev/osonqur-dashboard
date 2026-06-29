import { apiClient, PaginationParams, PaginatedResponse } from './client';

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  contactPerson?: string;
  vendorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierRequest {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  contactPerson?: string;
}

export interface UpdateSupplierRequest {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  contactPerson?: string;
}

export interface GetSuppliersParams extends PaginationParams {
  search?: string;
}

export interface SupplierOrder {
  id: string;
  supplierId: string;
  smetaItemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: string;
  orderDate: string;
  deliveryDate?: string;
  vendorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierOrderRequest {
  supplierId: string;
  smetaItemId: string;
  quantity: number;
  unitPrice: number;
  orderDate: string;
  deliveryDate?: string;
}

export interface GetSupplierOrdersParams extends PaginationParams {
  supplierId?: string;
  status?: string;
  search?: string;
}

export interface SupplierDebt {
  id: string;
  supplierId: string;
  amount: number;
  dueDate?: string;
  description?: string;
  reason?: string;
  paidAmount?: number;
  isPaid: boolean;
  paidAt?: string;
  vendorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierDebtRequest {
  supplierId: string;
  amount: number;
  dueDate?: string;
  description?: string;
}

export interface GetSupplierDebtsParams extends PaginationParams {
  isPaid?: boolean;
}

export interface UpdateSupplierOrderRequest {
  quantity?: number;
  unitPrice?: number;
  status?: string;
  deliveryDate?: string;
}

export const suppliersApi = {
  // Supplier CRUD
  getAll: (params?: GetSuppliersParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    
    const query = searchParams.toString();
    return apiClient<PaginatedResponse<Supplier>>(
      `/vendor/suppliers${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },

  getById: (id: string) =>
    apiClient<Supplier>(`/vendor/suppliers/${id}`, {
      method: 'GET',
    }),

  create: (data: CreateSupplierRequest) =>
    apiClient<Supplier>('/vendor/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateSupplierRequest) =>
    apiClient<Supplier>(`/vendor/suppliers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiClient<void>(`/vendor/suppliers/${id}`, {
      method: 'DELETE',
    }),

  // Supplier Debts
  getDebts: (supplierId: string, params?: GetSupplierDebtsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.isPaid !== undefined) searchParams.append('isPaid', params.isPaid.toString());
    
    const query = searchParams.toString();
    return apiClient<PaginatedResponse<SupplierDebt>>(
      `/vendor/suppliers/${supplierId}/debts${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },

  createDebt: (data: CreateSupplierDebtRequest) =>
    apiClient<SupplierDebt>('/vendor/suppliers/debts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  payDebt: (id: string, amount?: number, projectId?: string) =>
    apiClient<{ success: boolean }>(`/vendor/suppliers/debts/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify({ amount, projectId }),
    }),

  // Supply Orders
  createOrder: (data: CreateSupplierOrderRequest) =>
    apiClient<SupplierOrder>('/vendor/suppliers/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getOrders: (params?: GetSupplierOrdersParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.supplierId) searchParams.append('supplierId', params.supplierId);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.search) searchParams.append('search', params.search);
    
    const query = searchParams.toString();
    return apiClient<PaginatedResponse<SupplierOrder>>(
      `/vendor/suppliers/orders/list${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },

  getOrderById: (id: string) =>
    apiClient<SupplierOrder>(`/vendor/suppliers/orders/${id}`, {
      method: 'GET',
    }),

  updateOrder: (id: string, data: UpdateSupplierOrderRequest) =>
    apiClient<SupplierOrder>(`/vendor/suppliers/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteOrder: (id: string) =>
    apiClient<void>(`/vendor/suppliers/orders/${id}`, {
      method: 'DELETE',
    }),

  // Supplier portal methods (for POSTAVSHIK role)
  getMyOrders: (params?: GetSupplierOrdersParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);

    const query = searchParams.toString();
    return apiClient<PaginatedResponse<SupplierOrder>>(
      `/vendor/suppliers/my/orders${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },

  getMyDebts: (params?: GetSupplierDebtsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.isPaid !== undefined) searchParams.append('isPaid', params.isPaid.toString());

    const query = searchParams.toString();
    return apiClient<PaginatedResponse<SupplierDebt>>(
      `/vendor/suppliers/my/debts${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },

  getMyPayments: (params?: PaginationParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const query = searchParams.toString();
    return apiClient<PaginatedResponse<SupplierDebt>>(
      `/vendor/suppliers/my/payments${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },
};
