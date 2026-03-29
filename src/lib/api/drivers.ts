import { apiClient, PaginationParams, PaginatedResponse } from './client';

// Types matching the backend DriverDeliveryDto
export interface DeliverySmetaItem {
  id: string;
  name: string;
  unit: string;
  category: string;
}

export interface DeliveryProject {
  id: string;
  name: string;
}

export interface DriverDelivery {
  id: string;
  status: string;
  requestedQty: number;
  approvedQty?: number;
  approvedAmount?: number;
  collectedQty?: number;
  collectedAt?: string;
  deliveredQty?: number;
  deliveredAt?: string;
  supplierName?: string;
  note?: string;
  createdAt: string;
  smetaItem: DeliverySmetaItem;
  project: DeliveryProject;
  // batch grouping for frontend use
  batchId?: string;
  requestedBy?: { id: string; name: string };
}

export interface CollectDeliveryRequest {
  collectedQty: number;
  note?: string;
  photoFileId?: string;
}

export interface DeliverDeliveryRequest {
  deliveredQty: number;
  note?: string;
  photoFileId?: string;
}

export interface GetMyDeliveriesParams {
  status?: string;
  projectId?: string;
}

export interface GetDeliveryHistoryParams {
  dateFrom?: string;
  dateTo?: string;
  projectId?: string;
}

export const driversApi = {
  getMyDeliveries: (params?: GetMyDeliveriesParams) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.projectId) searchParams.append('projectId', params.projectId);

    const query = searchParams.toString();
    return apiClient<PaginatedResponse<DriverDelivery>>(
      `/vendor/drivers/my-deliveries${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },

  collectDelivery: (id: string, data: CollectDeliveryRequest) =>
    apiClient<DriverDelivery>(`/vendor/drivers/deliveries/${id}/collect`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deliverDelivery: (id: string, data: DeliverDeliveryRequest) =>
    apiClient<DriverDelivery>(`/vendor/drivers/deliveries/${id}/deliver`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  rejectDelivery: (id: string) =>
    apiClient<DriverDelivery>(`/vendor/drivers/deliveries/${id}/reject`, {
      method: 'POST',
    }),

  getHistory: (params?: GetDeliveryHistoryParams) => {
    const searchParams = new URLSearchParams();
    if (params?.dateFrom) searchParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) searchParams.append('dateTo', params.dateTo);
    if (params?.projectId) searchParams.append('projectId', params.projectId);

    const query = searchParams.toString();
    return apiClient<PaginatedResponse<DriverDelivery>>(
      `/vendor/drivers/history${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },
};
