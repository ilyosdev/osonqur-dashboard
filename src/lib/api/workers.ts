import { apiClient, PaginationParams, PaginatedResponse } from './client';

export interface Worker {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  position?: string;
  salary?: number;
  vendorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkerRequest {
  firstName: string;
  lastName: string;
  phone?: string;
  position?: string;
  salary?: number;
}

export interface GetWorkersParams extends PaginationParams {
  position?: string;
  search?: string;
}

export interface WorkLog {
  id: string;
  workType: string;
  unit: string;
  quantity: number;
  unitPrice?: number | null;
  totalAmount?: number | null;
  date: string;
  isValidated: boolean;
  isRejected?: boolean;
  rejectionReason?: string | null;
  validatedAt?: string | null;
  worker?: { id: string; name: string };
  project?: { id: string; name: string };
  smetaItem?: { id: string; name: string };
  loggedBy: { id: string; name: string };
  validatedBy?: { id: string; name: string } | null;
  createdAt: string;
}

export interface CreateWorkLogRequest {
  workerId: string;
  projectId: string;
  date: string;
  hoursWorked: number;
  description?: string;
}

export interface WorkerPayment {
  id: string;
  workerId: string;
  amount: number;
  paymentDate: string;
  paymentType: string;
  description?: string;
  vendorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkerPaymentRequest {
  workerId: string;
  amount: number;
  paymentDate: string;
  paymentType: string;
  description?: string;
}

export interface UpdateWorkerRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  position?: string;
  salary?: number;
}

export interface GetWorkLogsParams extends PaginationParams {
  workerId?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
}

export interface GetUnvalidatedWorkLogsParams extends PaginationParams {
  projectId?: string;
}

export interface ValidateWorkLogRequest {
  isValidated: boolean;
  validatedBy?: string;
}

export interface GetWorkerPaymentsParams extends PaginationParams {
  workerId?: string;
  paymentType?: string;
  startDate?: string;
  endDate?: string;
}

export const workersApi = {
  // Worker CRUD
  getAll: (params?: GetWorkersParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.position) searchParams.append('position', params.position);
    if (params?.search) searchParams.append('search', params.search);
    
    const query = searchParams.toString();
    return apiClient<PaginatedResponse<Worker>>(
      `/vendor/workers${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },

  getById: (id: string) =>
    apiClient<Worker>(`/vendor/workers/${id}`, {
      method: 'GET',
    }),

  create: (data: CreateWorkerRequest) =>
    apiClient<Worker>('/vendor/workers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateWorkerRequest) =>
    apiClient<Worker>(`/vendor/workers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiClient<void>(`/vendor/workers/${id}`, {
      method: 'DELETE',
    }),

  // Work Logs
  getWorkLogs: (params?: GetWorkLogsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.workerId) searchParams.append('workerId', params.workerId);
    if (params?.projectId) searchParams.append('projectId', params.projectId);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    
    const query = searchParams.toString();
    return apiClient<PaginatedResponse<WorkLog>>(
      `/vendor/workers/work-logs/list${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },

  getWorkLogById: (id: string) =>
    apiClient<WorkLog>(`/vendor/workers/work-logs/${id}`, {
      method: 'GET',
    }),

  createWorkLog: (data: CreateWorkLogRequest) =>
    apiClient<WorkLog>('/vendor/workers/work-logs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  validateWorkLog: (id: string, data: ValidateWorkLogRequest) =>
    apiClient<WorkLog>(`/vendor/workers/work-logs/${id}/validate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteWorkLog: (id: string) =>
    apiClient<void>(`/vendor/workers/work-logs/${id}`, {
      method: 'DELETE',
    }),

  getUnvalidatedWorkLogs: (params?: GetUnvalidatedWorkLogsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.projectId) searchParams.append('projectId', params.projectId);

    const query = searchParams.toString();
    return apiClient<PaginatedResponse<WorkLog>>(
      `/vendor/workers/work-logs/unvalidated${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },

  // Payments
  getPayments: (params?: GetWorkerPaymentsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.workerId) searchParams.append('workerId', params.workerId);
    if (params?.paymentType) searchParams.append('paymentType', params.paymentType);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    
    const query = searchParams.toString();
    return apiClient<PaginatedResponse<WorkerPayment>>(
      `/vendor/workers/payments/list${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },

  getPaymentById: (id: string) =>
    apiClient<WorkerPayment>(`/vendor/workers/payments/${id}`, {
      method: 'GET',
    }),

  createPayment: (data: CreateWorkerPaymentRequest) =>
    apiClient<WorkerPayment>('/vendor/workers/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Enhanced validation methods
  validateWithPrice: (id: string, data: { unitPrice: number; totalAmount: number }) =>
    apiClient<WorkLog>(`/vendor/workers/work-logs/${id}/validate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  rejectWorkLog: (id: string, data: { reason?: string }) =>
    apiClient<WorkLog>(`/vendor/workers/work-logs/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Worker portal methods (for WORKER role)
  getMyWorkLogs: (params?: GetWorkLogsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);

    const query = searchParams.toString();
    return apiClient<PaginatedResponse<WorkLog>>(
      `/vendor/workers/my/work-logs${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },

  getMyPayments: (params?: GetWorkerPaymentsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);

    const query = searchParams.toString();
    return apiClient<PaginatedResponse<WorkerPayment>>(
      `/vendor/workers/my/payments${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },

  getMyBalance: () =>
    apiClient<{ totalEarned: number; totalPaid: number; netBalance: number }>(
      '/vendor/workers/my/balance',
      { method: 'GET' }
    ),
};
