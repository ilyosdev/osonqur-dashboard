import { apiClient } from './client';

// Dashboard Summary
export interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  budget: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  completionPercentage: number;
}

export interface DashboardSummary {
  totalProjects: number;
  activeProjects: number;
  totalBudget: number;
  totalIncome: number;
  totalExpense: number;
  totalSupplierDebt: number;
  totalWorkerDebt: number;
  totalAccountBalance: number;
  totalCashRegisterBalance: number;
  projects: ProjectSummary[];
}

// Supplier Debts
export interface SupplierDebtSummary {
  supplierId: string;
  supplierName: string;
  totalDebt: number;
  unpaidCount: number;
}

export interface SupplierDebtsSummary {
  totalDebt: number;
  supplierCount: number;
  suppliers: SupplierDebtSummary[];
}

// Worker Debts
export interface WorkerDebtSummary {
  workerId: string;
  workerName: string;
  totalEarned: number;
  totalPaid: number;
  debt: number;
}

export interface WorkerDebtsSummary {
  totalDebt: number;
  workerCount: number;
  workers: WorkerDebtSummary[];
}

// Warehouse Value
export interface WarehouseValue {
  warehouseId: string;
  warehouseName: string;
  projectId: string;
  projectName: string;
  itemCount: number;
  totalQuantity: number;
}

export interface WarehouseValueSummary {
  totalWarehouses: number;
  totalItems: number;
  warehouses: WarehouseValue[];
}

// Work Completion
export interface WorkCompletion {
  projectId: string;
  projectName: string;
  totalWorkLogs: number;
  validatedWorkLogs: number;
  validationPercentage: number;
  totalAmount: number;
  validatedAmount: number;
}

export interface WorkCompletionSummary {
  overallValidationPercentage: number;
  totalValidatedAmount: number;
  projects: WorkCompletion[];
}

// Profit/Loss
export interface ProfitLoss {
  projectId: string;
  projectName: string;
  budget: number;
  totalIncome: number;
  totalExpense: number;
  netProfitLoss: number;
  budgetUtilizationPercentage: number;
}

export interface ProfitLossSummary {
  totalBudget: number;
  totalIncome: number;
  totalExpense: number;
  netProfitLoss: number;
  projects: ProfitLoss[];
}

// Account Balances
export interface AccountBalance {
  id: string;
  name: string;
  type: 'ACCOUNT' | 'CASH_REGISTER';
  balance: number;
}

export interface AccountBalancesSummary {
  totalAccountBalance: number;
  totalCashRegisterBalance: number;
  grandTotal: number;
  accounts: AccountBalance[];
}

// Smeta Monitoring
export interface SmetaItemMonitoring {
  smetaItemId: string;
  name: string;
  category: string;
  unit: string;
  smetaQuantity: number;
  smetaUnitPrice: number;
  smetaTotalAmount: number;
  usedQuantity: number;
  usedAmount: number;
  remainingQuantity: number;
  remainingAmount: number;
  usagePercentage: number;
  isOverrun: boolean;
  overrunQuantity: number;
  overrunAmount: number;
}

export interface SmetaMonitoringSummary {
  projectId: string;
  projectName: string;
  totalSmetaAmount: number;
  totalUsedAmount: number;
  totalRemainingAmount: number;
  overallUsagePercentage: number;
  itemsOverrun: number;
  totalItems: number;
  items: SmetaItemMonitoring[];
}

// Single Project Summary
export interface SingleProjectSummary {
  projectId: string;
  projectName: string;
  status: string;
  budget: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  budgetUtilizationPercentage: number;
  pendingRequests: number;
  pendingCashRequests: number;
  unvalidatedWorkLogs: number;
  totalWorkLogs: number;
  validatedWorkLogs: number;
  workLogValidationPercentage: number;
  warehouseItemCount: number;
  supplierDebt: number;
  workerDebt: number;
}

// Pending Summary
export interface PendingSummary {
  pendingRequests: number;
  pendingCashRequests: number;
  unvalidatedWorkLogs: number;
  pendingExpenses: number;
  inTransitRequests: number;
  deliveredRequests: number;
  receivedRequests: number;
}

// Analytics API
export const analyticsApi = {
  getDashboardSummary: () =>
    apiClient<DashboardSummary>('/vendor/analytics/summary', {
      method: 'GET',
    }),

  getSupplierDebts: () =>
    apiClient<SupplierDebtsSummary>('/vendor/analytics/supplier-debts', {
      method: 'GET',
    }),

  getWorkerDebts: () =>
    apiClient<WorkerDebtsSummary>('/vendor/analytics/worker-debts', {
      method: 'GET',
    }),

  getWarehouseValue: () =>
    apiClient<WarehouseValueSummary>('/vendor/analytics/warehouse-value', {
      method: 'GET',
    }),

  getWorkCompletion: () =>
    apiClient<WorkCompletionSummary>('/vendor/analytics/work-completion', {
      method: 'GET',
    }),

  getProfitLoss: () =>
    apiClient<ProfitLossSummary>('/vendor/analytics/profit-loss', {
      method: 'GET',
    }),

  getAccountBalances: () =>
    apiClient<AccountBalancesSummary>('/vendor/analytics/account-balances', {
      method: 'GET',
    }),

  getSmetaMonitoring: (projectId?: string) => {
    const params = projectId ? `?projectId=${projectId}` : '';
    return apiClient<SmetaMonitoringSummary[]>(
      `/vendor/analytics/smeta-monitoring${params}`,
      { method: 'GET' }
    );
  },

  getProjectSummary: (projectId: string) =>
    apiClient<SingleProjectSummary>(`/vendor/analytics/project/${projectId}/summary`, {
      method: 'GET',
    }),

  getPendingSummary: () =>
    apiClient<PendingSummary>('/vendor/analytics/pending-summary', {
      method: 'GET',
    }),
};
