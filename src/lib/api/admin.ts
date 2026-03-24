import { apiClient, PaginationParams } from './client';

// ─── Types ────────────────────────────────────────

export type SubscriptionTier = 'ODDIY' | 'PRO' | 'ENTERPRISE';

export interface AdminOrganization {
  id: string;
  name: string;
  phone?: string;
  inn?: string;
  address?: string;
  responsiblePerson?: string;
  logo?: string;
  subscriptionTier: SubscriptionTier;
  isActive: boolean;
  userCount: number;
  projectCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationRequest {
  name: string;
  phone: string;
  responsiblePerson: string;
  password: string;
  subscriptionTier?: SubscriptionTier;
  inn?: string;
  address?: string;
  logo?: string;
}

export interface CreateOrganizationResponse {
  organization: AdminOrganization;
  adminUser: {
    id: string;
    name: string;
    phone: string;
  };
}

export interface AdminOperator {
  id: string;
  name: string;
  phone?: string;
  role: string;
  isActive: boolean;
  orgCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrgUser {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  telegramId?: string;
  role: string;
  allowedRoles?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrgProject {
  id: string;
  name: string;
  address?: string;
  floors?: number;
  budget?: number;
  status: string;
  userCount: number;
  smetaCount: number;
  smetaBudgetTotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStats {
  totalOrganizations: number;
  totalOperators: number;
  totalUsers: number;
  totalProjects: number;
}

export interface UserProjectAssignment {
  projectId: string;
  projectName: string;
}

export type AdminSmetaType = 'CONSTRUCTION' | 'ELECTRICAL' | 'PLUMBING' | 'HVAC' | 'FINISHING' | 'OTHER';

export interface AdminProjectSmeta {
  id: string;
  projectId: string;
  name: string;
  type: AdminSmetaType;
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
  project?: { name: string };
}

export interface AdminProjectUser {
  id: string;
  name: string;
  phone?: string;
  role: string;
  isActive: boolean;
  projectId: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

interface SearchParams extends PaginationParams {
  search?: string;
}

interface SmetaSearchParams extends SearchParams {
  type?: AdminSmetaType;
}

// ─── Helpers ──────────────────────────────────────

function buildQuery(params?: SearchParams): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append('page', params.page.toString());
  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.search) searchParams.append('search', params.search);
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

function buildSmetaQuery(params?: SmetaSearchParams): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append('page', params.page.toString());
  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.search) searchParams.append('search', params.search);
  if (params.type) searchParams.append('type', params.type);
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

// ─── API ──────────────────────────────────────────

export const adminApi = {
  // Stats
  getStats: () =>
    apiClient<AdminStats>('/admin/stats', { method: 'GET' }),

  // Organizations
  getOrganizations: (params?: SearchParams) =>
    apiClient<PaginatedResponse<AdminOrganization>>(
      `/admin/organizations${buildQuery(params)}`,
      { method: 'GET' },
    ),

  getOrganization: (id: string) =>
    apiClient<AdminOrganization>(`/admin/organizations/${id}`, { method: 'GET' }),

  createOrganization: (data: CreateOrganizationRequest) =>
    apiClient<CreateOrganizationResponse>('/admin/organizations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateOrganization: (id: string, data: { name?: string; phone?: string; inn?: string; address?: string; responsiblePerson?: string; isActive?: boolean }) =>
    apiClient<AdminOrganization>(`/admin/organizations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteOrganization: (id: string) =>
    apiClient<{ success: boolean }>(`/admin/organizations/${id}`, { method: 'DELETE' }),

  // Operators
  getOperators: (params?: SearchParams) =>
    apiClient<PaginatedResponse<AdminOperator>>(
      `/admin/operators${buildQuery(params)}`,
      { method: 'GET' },
    ),

  createOperator: (data: { name: string; phone: string; password: string; orgIds?: string[] }) =>
    apiClient<AdminOperator>('/admin/operators', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateOperator: (id: string, data: { name?: string; phone?: string; password?: string; isActive?: boolean }) =>
    apiClient<AdminOperator>(`/admin/operators/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteOperator: (id: string) =>
    apiClient<{ success: boolean }>(`/admin/operators/${id}`, { method: 'DELETE' }),

  // Org Users
  getOrgUsers: (orgId: string, params?: SearchParams) =>
    apiClient<PaginatedResponse<AdminOrgUser>>(
      `/admin/organizations/${orgId}/users${buildQuery(params)}`,
      { method: 'GET' },
    ),

  createOrgUser: (orgId: string, data: { name: string; phone: string; password: string; role: string; allowedRoles?: string[]; telegramId?: string }) =>
    apiClient<AdminOrgUser>(`/admin/organizations/${orgId}/users`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateOrgUser: (orgId: string, userId: string, data: { name?: string; phone?: string; password?: string; role?: string; allowedRoles?: string[]; isActive?: boolean; telegramId?: string }) =>
    apiClient<AdminOrgUser>(`/admin/organizations/${orgId}/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteOrgUser: (orgId: string, userId: string) =>
    apiClient<{ success: boolean }>(`/admin/organizations/${orgId}/users/${userId}`, { method: 'DELETE' }),

  // Org Projects
  getOrgProjects: (orgId: string, params?: SearchParams) =>
    apiClient<PaginatedResponse<AdminOrgProject>>(
      `/admin/organizations/${orgId}/projects${buildQuery(params)}`,
      { method: 'GET' },
    ),

  createOrgProject: (orgId: string, data: { name: string; address?: string; floors?: number; budget?: number }) =>
    apiClient<AdminOrgProject>(`/admin/organizations/${orgId}/projects`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateOrgProject: (orgId: string, projectId: string, data: { name?: string; address?: string; floors?: number; budget?: number; status?: string }) =>
    apiClient<AdminOrgProject>(`/admin/organizations/${orgId}/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteOrgProject: (orgId: string, projectId: string) =>
    apiClient<{ success: boolean }>(`/admin/organizations/${orgId}/projects/${projectId}`, { method: 'DELETE' }),

  // User-Project assignments
  getUserProjects: (orgId: string, userId: string) =>
    apiClient<UserProjectAssignment[]>(`/admin/organizations/${orgId}/users/${userId}/projects`, { method: 'GET' }),

  assignUserToProject: (orgId: string, userId: string, projectId: string) =>
    apiClient<{ success: boolean }>(`/admin/organizations/${orgId}/users/${userId}/projects`, {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    }),

  unassignUserFromProject: (orgId: string, userId: string, projectId: string) =>
    apiClient<{ success: boolean }>(`/admin/organizations/${orgId}/users/${userId}/projects/${projectId}`, { method: 'DELETE' }),

  // Project Smetas
  getProjectSmetas: (orgId: string, projectId: string, params?: SmetaSearchParams) =>
    apiClient<PaginatedResponse<AdminProjectSmeta>>(
      `/admin/organizations/${orgId}/projects/${projectId}/smetas${buildSmetaQuery(params)}`,
      { method: 'GET' },
    ),

  getProjectSmeta: (orgId: string, projectId: string, smetaId: string) =>
    apiClient<AdminProjectSmeta>(`/admin/organizations/${orgId}/projects/${projectId}/smetas/${smetaId}`, { method: 'GET' }),

  createProjectSmeta: (orgId: string, projectId: string, data: { name: string; type?: AdminSmetaType; description?: string; budget?: number; deadline?: string; overheadPercent?: number }) =>
    apiClient<AdminProjectSmeta>(`/admin/organizations/${orgId}/projects/${projectId}/smetas`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProjectSmeta: (orgId: string, projectId: string, smetaId: string, data: { name?: string; type?: AdminSmetaType; description?: string; budget?: number; deadline?: string; overheadPercent?: number }) =>
    apiClient<AdminProjectSmeta>(`/admin/organizations/${orgId}/projects/${projectId}/smetas/${smetaId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteProjectSmeta: (orgId: string, projectId: string, smetaId: string) =>
    apiClient<{ success: boolean }>(`/admin/organizations/${orgId}/projects/${projectId}/smetas/${smetaId}`, { method: 'DELETE' }),

  // Project Users (assigned)
  getProjectUsers: (orgId: string, projectId: string) =>
    apiClient<AdminProjectUser[]>(`/admin/organizations/${orgId}/projects/${projectId}/users`, { method: 'GET' }),
};
