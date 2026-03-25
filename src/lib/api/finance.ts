import { apiClient, PaginationParams, PaginatedResponse } from './client';

// Accounts
export interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  vendorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountRequest {
  name: string;
  type: string;
  balance?: number;
  currency?: string;
}

export interface UpdateAccountRequest {
  name?: string;
  type?: string;
  balance?: number;
  currency?: string;
}

export interface GetAccountsParams extends PaginationParams {
  type?: string;
  search?: string;
}

// Incomes
export interface Income {
  id: string;
  accountId: string;
  amount: number;
  date: string;
  category: string;
  description?: string;
  vendorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncomeRequest {
  accountId: string;
  amount: number;
  date: string;
  category: string;
  description?: string;
}

export interface UpdateIncomeRequest {
  accountId?: string;
  amount?: number;
  date?: string;
  category?: string;
  description?: string;
}

export interface GetIncomesParams extends PaginationParams {
  accountId?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

// Expenses
export interface Expense {
  id: string;
  accountId: string;
  amount: number;
  date: string;
  category: string;
  description?: string;
  vendorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseRequest {
  accountId: string;
  amount: number;
  date: string;
  category: string;
  description?: string;
}

export interface UpdateExpenseRequest {
  accountId?: string;
  amount?: number;
  date?: string;
  category?: string;
  description?: string;
}

export interface GetExpensesParams extends PaginationParams {
  accountId?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

// Cash Registers
export interface CashRegister {
  id: string;
  name: string;
  location?: string;
  balance: number;
  totalIn?: number;
  totalOut?: number;
  vendorId: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; role?: string };
}

export interface CreateCashRegisterRequest {
  name: string;
  location?: string;
  balance?: number;
}

export interface UpdateCashRegisterRequest {
  name?: string;
  location?: string;
  balance?: number;
}

export interface GetCashRegistersParams extends PaginationParams {
  search?: string;
}

// Accounts API
export const accountsApi = {
  getAll: (params?: GetAccountsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.type) searchParams.append('type', params.type);
    if (params?.search) searchParams.append('search', params.search);
    
    const query = searchParams.toString();
    return apiClient<PaginatedResponse<Account>>(
      `/vendor/accounts${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },

  getById: (id: string) =>
    apiClient<Account>(`/vendor/accounts/${id}`, {
      method: 'GET',
    }),

  create: (data: CreateAccountRequest) =>
    apiClient<Account>('/vendor/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateAccountRequest) =>
    apiClient<Account>(`/vendor/accounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiClient<void>(`/vendor/accounts/${id}`, {
      method: 'DELETE',
    }),
};

// Incomes API
export const incomesApi = {
  getAll: (params?: GetIncomesParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.accountId) searchParams.append('accountId', params.accountId);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.search) searchParams.append('search', params.search);
    
    const query = searchParams.toString();
    return apiClient<PaginatedResponse<Income>>(
      `/vendor/incomes${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },

  getById: (id: string) =>
    apiClient<Income>(`/vendor/incomes/${id}`, {
      method: 'GET',
    }),

  create: (data: CreateIncomeRequest) =>
    apiClient<Income>('/vendor/incomes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateIncomeRequest) =>
    apiClient<Income>(`/vendor/incomes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiClient<void>(`/vendor/incomes/${id}`, {
      method: 'DELETE',
    }),
};

// Expenses API
export const expensesApi = {
  getAll: (params?: GetExpensesParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.accountId) searchParams.append('accountId', params.accountId);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.search) searchParams.append('search', params.search);
    
    const query = searchParams.toString();
    return apiClient<PaginatedResponse<Expense>>(
      `/vendor/expenses${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },

  getById: (id: string) =>
    apiClient<Expense>(`/vendor/expenses/${id}`, {
      method: 'GET',
    }),

  create: (data: CreateExpenseRequest) =>
    apiClient<Expense>('/vendor/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateExpenseRequest) =>
    apiClient<Expense>(`/vendor/expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiClient<void>(`/vendor/expenses/${id}`, {
      method: 'DELETE',
    }),
};

// Cash Register (Detailed - from API response)
export interface CashRegisterDetailed {
  id: string;
  userId: string;
  name: string;
  balance: number;
  totalIn: number;
  totalOut: number;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string };
}

// Cash Register Transactions
export interface CashTransaction {
  id: string;
  cashRegisterId: string;
  type: 'IN' | 'OUT';
  amount: number;
  note?: string | null;
  createdAt: string;
}

export interface CreateCashTransactionRequest {
  cashRegisterId: string;
  type: 'IN' | 'OUT';
  amount: number;
  note?: string;
}

export interface GetCashTransactionsParams extends PaginationParams {
  type?: 'IN' | 'OUT';
  dateFrom?: string;
  dateTo?: string;
}

// Cash Requests
export interface CashRequest {
  id: string;
  projectId: string;
  requestedById: string;
  amount: number;
  reason: string | null;
  neededBy: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULFILLED';
  approvedById: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
  requestedBy?: { id: string; name: string };
  approvedBy?: { id: string; name: string } | null;
}

export interface CreateCashRequestRequest {
  projectId: string;
  amount: number;
  reason?: string;
  neededBy?: string;
}

export interface GetCashRequestsParams extends PaginationParams {
  status?: string;
  projectId?: string;
}

// Cash Registers API
export const cashRegistersApi = {
  getAll: (params?: GetCashRegistersParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);

    const query = searchParams.toString();
    return apiClient<PaginatedResponse<CashRegister>>(
      `/vendor/cash-registers${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },

  getMyKoshelok: () =>
    apiClient<CashRegisterDetailed>('/vendor/cash-registers/my', {
      method: 'GET',
    }),

  getById: (id: string) =>
    apiClient<CashRegister>(`/vendor/cash-registers/${id}`, {
      method: 'GET',
    }),

  create: (data: CreateCashRegisterRequest) =>
    apiClient<CashRegister>('/vendor/cash-registers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateCashRegisterRequest) =>
    apiClient<CashRegister>(`/vendor/cash-registers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiClient<void>(`/vendor/cash-registers/${id}`, {
      method: 'DELETE',
    }),

  // Transactions
  getTransactions: (cashRegisterId: string, params?: GetCashTransactionsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.type) searchParams.append('type', params.type);
    if (params?.dateFrom) searchParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) searchParams.append('dateTo', params.dateTo);

    const query = searchParams.toString();
    return apiClient<PaginatedResponse<CashTransaction>>(
      `/vendor/cash-registers/${cashRegisterId}/transactions${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },

  createTransaction: (data: CreateCashTransactionRequest) =>
    apiClient<CashTransaction>('/vendor/cash-registers/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Cash Requests API
export const cashRequestsApi = {
  getAll: (params?: GetCashRequestsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.projectId) searchParams.append('projectId', params.projectId);

    const query = searchParams.toString();
    return apiClient<PaginatedResponse<CashRequest>>(
      `/vendor/cash-requests${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
  },

  create: (data: CreateCashRequestRequest) =>
    apiClient<CashRequest>('/vendor/cash-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  approve: (id: string) =>
    apiClient<CashRequest>(`/vendor/cash-requests/${id}/approve`, {
      method: 'PATCH',
    }),

  reject: (id: string, data: { rejectionReason?: string }) =>
    apiClient<CashRequest>(`/vendor/cash-requests/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiClient<void>(`/vendor/cash-requests/${id}`, {
      method: 'DELETE',
    }),
};
