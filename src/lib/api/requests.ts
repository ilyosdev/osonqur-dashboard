import { apiClient, PaginationParams, PaginatedResponse } from './client';

// Related data returned by backend JOINs
export interface SmetaItemRelation {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

export interface UserRelation {
  id: string;
  name: string;
}

export interface PurchaseRequest {
  id: string;
  smetaItemId: string;
  requestedQty: number;
  requestedAmount: number;
  note?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_TRANSIT' | 'DELIVERED' | 'RECEIVED' | 'FINALIZED';
  requestedById: string;
  approvedById?: string;
  approvedAt?: string;
  rejectionReason?: string;
  source: 'DASHBOARD' | 'TELEGRAM';
  isOverrun: boolean;
  overrunQty?: number;
  overrunPercent?: number;
  createdAt: string;
  updatedAt: string;
  // Batch grouping (for requests created together)
  batchId?: string;
  // Related data from JOINs
  smetaItem?: SmetaItemRelation;
  requestedBy?: UserRelation;
  approvedBy?: UserRelation | null;
  // Project info
  project?: { id: string; name: string };
}

export interface CreatePurchaseRequestRequest {
  smetaItemId: string;
  requestedQty: number;
  requestedAmount: number;
  note?: string;
  source?: 'DASHBOARD' | 'TELEGRAM';
}

export interface GetPurchaseRequestsParams extends PaginationParams {
  status?: string;
  smetaItemId?: string;
  requestedBy?: string;
  search?: string;
  projectId?: string;
}

// Alias for backwards compatibility
export type GetRequestsParams = GetPurchaseRequestsParams;

export interface ApproveRequestResponse {
  id: string;
  status: string;
  approvedById: string;
  approvedAt: string;
}

export interface RejectRequestRequest {
  reason: string;
}

export interface RejectRequestResponse {
  id: string;
  status: string;
  rejectionReason: string;
}

export interface UpdatePurchaseRequestRequest {
  requestedQty?: number;
  requestedAmount?: number;
  note?: string;
}

export const requestsApi = {
  getAll: (params?: GetPurchaseRequestsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.smetaItemId) searchParams.append('smetaItemId', params.smetaItemId);
    if (params?.requestedBy) searchParams.append('requestedBy', params.requestedBy);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.projectId) searchParams.append('projectId', params.projectId);

    const query = searchParams.toString();
    return apiClient<PaginatedResponse<PurchaseRequest>>(
      `/vendor/requests${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },

  getById: (id: string) =>
    apiClient<PurchaseRequest>(`/vendor/requests/${id}`, {
      method: 'GET',
    }),

  create: (data: CreatePurchaseRequestRequest) =>
    apiClient<PurchaseRequest>('/vendor/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdatePurchaseRequestRequest) =>
    apiClient<PurchaseRequest>(`/vendor/requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiClient<void>(`/vendor/requests/${id}`, {
      method: 'DELETE',
    }),

  approve: (id: string) =>
    apiClient<ApproveRequestResponse>(`/vendor/requests/${id}/approve`, {
      method: 'POST',
    }),

  reject: (id: string, reason: string) =>
    apiClient<RejectRequestResponse>(`/vendor/requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Delivery workflow methods
  assignDriver: (id: string, driverId: string) =>
    apiClient<PurchaseRequest>(`/vendor/requests/${id}/assign-driver`, {
      method: 'POST',
      body: JSON.stringify({ driverId }),
    }),

  markCollected: (id: string, data: { collectedQty: number; note?: string }) =>
    apiClient<PurchaseRequest>(`/vendor/requests/${id}/collected`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  markDelivered: (id: string, data: { deliveredQty: number; note?: string }) =>
    apiClient<PurchaseRequest>(`/vendor/requests/${id}/delivered`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  confirmReceipt: (id: string, data: { receivedQty: number; note?: string }) =>
    apiClient<PurchaseRequest>(`/vendor/requests/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  finalize: (id: string, data: { finalAmount: number; finalUnitPrice: number }) =>
    apiClient<PurchaseRequest>(`/vendor/requests/${id}/finalize`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getByDriver: (status?: string) => {
    const searchParams = new URLSearchParams();
    if (status) searchParams.append('status', status);
    const query = searchParams.toString();
    return apiClient<PaginatedResponse<PurchaseRequest>>(
      `/vendor/requests/driver${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },

  getPendingFinalization: () =>
    apiClient<PaginatedResponse<PurchaseRequest>>(
      '/vendor/requests?status=RECEIVED',
      { method: 'GET' }
    ),
};
