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
  templateIds?: string[];
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
  orgRoleId?: string;
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

export interface AdminPermission {
  id: string;
  key: string;
  name: string;
  description?: string;
  category?: string;
  groupId?: string;
}

export interface AdminPermissionGroup {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  permissions: AdminPermission[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminRoleTemplate {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
  permissions: AdminPermission[];
  canManage?: { canManageId: string; managed?: { id: string; name: string } }[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrgRole {
  id: string;
  name: string;
  description?: string;
  orgId: string;
  templateId?: string;
  templateName?: string;
  isActive: boolean;
  userCount: number;
  permissions: AdminPermission[];
  canManage?: { canManageId: string; managed?: { id: string; name: string } }[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminBotMenuItem {
  id: string;
  key: string;
  label: string;
  sortOrder: number;
  description?: string;
  isEnabled: boolean;
  permissions: { key: string; name: string; isActive: boolean }[];
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

  updateOrganization: (id: string, data: { name?: string; phone?: string; inn?: string; address?: string; responsiblePerson?: string; isActive?: boolean; subscriptionTier?: SubscriptionTier }) =>
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

  createOrgUser: (orgId: string, data: { name: string; phone: string; password: string; role?: string; orgRoleId?: string; allowedRoles?: string[]; telegramId?: string }) =>
    apiClient<AdminOrgUser>(`/admin/organizations/${orgId}/users`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateOrgUser: (orgId: string, userId: string, data: { name?: string; phone?: string; password?: string; role?: string; orgRoleId?: string; allowedRoles?: string[]; isActive?: boolean; telegramId?: string }) =>
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

  // ─── Permissions & Permission Groups ───────────────
  getPermissions: () =>
    apiClient<AdminPermission[]>('/admin/permissions', { method: 'GET' }),

  getPermissionGroups: () =>
    apiClient<AdminPermissionGroup[]>('/admin/permission-groups', { method: 'GET' }),

  createPermissionGroup: (data: { name: string; description?: string; sortOrder?: number }) =>
    apiClient<AdminPermissionGroup>('/admin/permission-groups', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePermissionGroup: (id: string, data: { name?: string; description?: string; sortOrder?: number }) =>
    apiClient<AdminPermissionGroup>(`/admin/permission-groups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deletePermissionGroup: (id: string) =>
    apiClient<{ success: boolean }>(`/admin/permission-groups/${id}`, { method: 'DELETE' }),

  addPermissionToGroup: (groupId: string, permissionId: string) =>
    apiClient<{ success: boolean }>(`/admin/permission-groups/${groupId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({ permissionId }),
    }),

  removePermissionFromGroup: (groupId: string, permissionId: string) =>
    apiClient<{ success: boolean }>(`/admin/permission-groups/${groupId}/permissions/${permissionId}`, { method: 'DELETE' }),

  // ─── Role Templates ────────────────────────────────
  getRoleTemplates: () =>
    apiClient<AdminRoleTemplate[]>('/admin/role-templates', { method: 'GET' }),

  getRoleTemplateDetails: (id: string) =>
    apiClient<AdminRoleTemplate>(`/admin/role-templates/${id}`, { method: 'GET' }),

  createRoleTemplate: (data: { name: string; description?: string }) =>
    apiClient<AdminRoleTemplate>('/admin/role-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateRoleTemplate: (id: string, data: { name?: string; description?: string; isActive?: boolean }) =>
    apiClient<AdminRoleTemplate>(`/admin/role-templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteRoleTemplate: (id: string) =>
    apiClient<{ success: boolean }>(`/admin/role-templates/${id}`, { method: 'DELETE' }),

  updateRoleTemplatePermissions: (id: string, permissionIds: string[]) =>
    apiClient<{ success: boolean }>(`/admin/role-templates/${id}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissionIds }),
    }),

  updateRoleTemplateAuthority: (id: string, canManageIds: string[]) =>
    apiClient<{ success: boolean }>(`/admin/role-templates/${id}/authority`, {
      method: 'PUT',
      body: JSON.stringify({ canManageIds }),
    }),

  syncRoleTemplate: (id: string, orgIds: string[]) =>
    apiClient<{ success: boolean; synced: number }>(`/admin/role-templates/${id}/sync`, {
      method: 'POST',
      body: JSON.stringify({ orgIds }),
    }),

  // ─── Org Roles ─────────────────────────────────────
  getOrgRoles: (orgId: string) =>
    apiClient<AdminOrgRole[]>(`/admin/orgs/${orgId}/roles`, { method: 'GET' }),

  getOrgRoleDetails: (orgId: string, roleId: string) =>
    apiClient<AdminOrgRole>(`/admin/orgs/${orgId}/roles/${roleId}`, { method: 'GET' }),

  createOrgRole: (orgId: string, data: { name: string; description?: string }) =>
    apiClient<AdminOrgRole>(`/admin/orgs/${orgId}/roles`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateOrgRole: (orgId: string, roleId: string, data: { name?: string; description?: string; isActive?: boolean }) =>
    apiClient<AdminOrgRole>(`/admin/orgs/${orgId}/roles/${roleId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteOrgRole: (orgId: string, roleId: string) =>
    apiClient<{ success: boolean }>(`/admin/orgs/${orgId}/roles/${roleId}`, { method: 'DELETE' }),

  updateOrgRolePermissions: (orgId: string, roleId: string, permissionIds: string[]) =>
    apiClient<{ success: boolean }>(`/admin/orgs/${orgId}/roles/${roleId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissionIds }),
    }),

  updateOrgRoleAuthority: (orgId: string, roleId: string, canManageIds: string[]) =>
    apiClient<{ success: boolean }>(`/admin/orgs/${orgId}/roles/${roleId}/authority`, {
      method: 'PUT',
      body: JSON.stringify({ canManageIds }),
    }),

  applyTemplateToOrg: (orgId: string, templateId: string) =>
    apiClient<AdminOrgRole>(`/admin/orgs/${orgId}/apply-template`, {
      method: 'POST',
      body: JSON.stringify({ templateId }),
    }),

  reassignOrgRoleUsers: (orgId: string, roleId: string, targetRoleId: string) =>
    apiClient<{ success: boolean; reassigned: number }>(`/admin/orgs/${orgId}/roles/${roleId}/reassign`, {
      method: 'POST',
      body: JSON.stringify({ targetRoleId }),
    }),

  getOrgRoleBotMenu: (orgId: string, roleId: string) =>
    apiClient<AdminBotMenuItem[]>(`/admin/orgs/${orgId}/roles/${roleId}/bot-menu`, { method: 'GET' }),

  updateOrgRoleBotMenu: (orgId: string, roleId: string, items: { botMenuItemId: string; isEnabled: boolean }[]) =>
    apiClient<AdminBotMenuItem[]>(`/admin/orgs/${orgId}/roles/${roleId}/bot-menu`, {
      method: 'PUT',
      body: JSON.stringify({ items }),
    }),
};
