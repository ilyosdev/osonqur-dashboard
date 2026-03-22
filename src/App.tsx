import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard, AdminGuard } from '@/lib/auth';
import AuthLayout from '@/layouts/AuthLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import AdminLayout from '@/layouts/AdminLayout';

// Auth pages
import LoginPage from '@/pages/auth/login';

// Dashboard pages
import HomePage from '@/pages/dashboard/index';
import ProjectsPage from '@/pages/dashboard/projects';
import ProjectDetailPage from '@/pages/dashboard/projects/[id]';
import RequestsPage from '@/pages/dashboard/requests';
import PendingRequestsPage from '@/pages/dashboard/requests/pending';
import UsersPage from '@/pages/dashboard/users';
import WorkersPage from '@/pages/dashboard/workers';
import SuppliersPage from '@/pages/dashboard/suppliers';
import WarehousePage from '@/pages/dashboard/warehouse';
import FinancePage from '@/pages/dashboard/finance';
import KassaPage from '@/pages/dashboard/kassa';
import ReportsPage from '@/pages/dashboard/reports';
import SettingsPage from '@/pages/dashboard/settings';
import ValidationPage from '@/pages/dashboard/validation';
import SmetasPage from '@/pages/dashboard/smetas';
import NewSmetaPage from '@/pages/dashboard/smetas/new';
import SmetaDetailPage from '@/pages/dashboard/smetas/[id]';
import AddSmetaItemPage from '@/pages/dashboard/smetas/[id]/add-item';
import DriverPage from '@/pages/dashboard/driver';
import ModeratorPage from '@/pages/dashboard/moderator';
import WorkerPortalPage from '@/pages/dashboard/worker-portal';
import SupplierPortalPage from '@/pages/dashboard/supplier-portal';
import SmetaComparisonPage from '@/pages/dashboard/smeta-comparison';
import ForemanPage from '@/pages/dashboard/foreman';
import DirektorPage from '@/pages/dashboard/direktor';
import SupplyPage from '@/pages/dashboard/supply';

// Admin pages
import AdminHomePage from '@/pages/admin/index';
import OperatorsPage from '@/pages/admin/operators';
import OrganizationsPage from '@/pages/admin/organizations/index';
import OrgUsersPage from '@/pages/admin/organizations/users';
import OrgProjectsPage from '@/pages/admin/organizations/projects';

function App() {
  return (
    <Routes>
      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Admin routes (SUPER_ADMIN + OPERATOR) */}
      <Route
        element={
          <AdminGuard>
            <AdminLayout />
          </AdminGuard>
        }
      >
        <Route path="/admin" element={<AdminHomePage />} />
        <Route path="/admin/operators" element={<OperatorsPage />} />
        <Route path="/admin/organizations" element={<OrganizationsPage />} />
        <Route path="/admin/organizations/:orgId/users" element={<OrgUsersPage />} />
        <Route path="/admin/organizations/:orgId/projects" element={<OrgProjectsPage />} />
      </Route>

      {/* Dashboard routes (protected) */}
      <Route
        element={
          <AuthGuard>
            <DashboardLayout />
          </AuthGuard>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/requests/pending" element={<PendingRequestsPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/workers" element={<WorkersPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/warehouse" element={<WarehousePage />} />
        <Route path="/kassa" element={<KassaPage />} />
        <Route path="/finance" element={<FinancePage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/validation" element={<ValidationPage />} />
        <Route path="/smetas" element={<SmetasPage />} />
        <Route path="/smetas/new" element={<NewSmetaPage />} />
        <Route path="/smetas/:id" element={<SmetaDetailPage />} />
        <Route path="/smetas/:id/add-item" element={<AddSmetaItemPage />} />
        <Route path="/driver" element={<DriverPage />} />
        <Route path="/moderator" element={<ModeratorPage />} />
        <Route path="/worker-portal" element={<WorkerPortalPage />} />
        <Route path="/supplier-portal" element={<SupplierPortalPage />} />
        <Route path="/smeta-comparison" element={<SmetaComparisonPage />} />
        <Route path="/foreman" element={<ForemanPage />} />
        <Route path="/direktor" element={<DirektorPage />} />
        <Route path="/supply" element={<SupplyPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
