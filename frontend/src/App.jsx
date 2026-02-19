import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import AuthLayout from './layouts/AuthLayout';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import OwnerLayout from './layouts/OwnerLayout';
import SubAdminLayout from './layouts/SubAdminLayout';
import UserLayout from './layouts/UserLayout';

import HomePage from './pages/public/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardHome from './pages/dashboard/DashboardHome';
import UserProfile from './pages/dashboard/UserProfile';
import OrganizationSettings from './pages/dashboard/OrganizationSettings';
import EmployeeList from './pages/dashboard/EmployeeList';
import RolesPage from './pages/dashboard/RolesPage';
import PayrollPage from './pages/dashboard/PayrollPage';
import RecruitmentDashboard from './pages/dashboard/RecruitmentDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import AttendancePage from './pages/dashboard/AttendancePage';
import LeavePage from './pages/dashboard/LeavePage';
import DocumentsPage from './pages/dashboard/DocumentsPage';
import OrgChartPage from './pages/dashboard/OrgChartPage';
import PerformancePage from './pages/dashboard/PerformancePage';
import FeedPage from './pages/dashboard/FeedPage';
import NetworkPage from './pages/dashboard/NetworkPage';
import SettingsPage from './pages/dashboard/SettingsPage';
import HelpPage from './pages/dashboard/HelpPage';
import JobsPage from './pages/dashboard/JobsPage';
import ChatPage from './pages/dashboard/ChatPage';

import { useAuthStore } from './store/authStore';
import AIWidget from './components/shared/AIWidget';

const getPanelHome = (panel) => {
  if (panel === 'SUPERADMIN') return '/superadmin/dashboard';
  if (panel === 'OWNER') return '/owner/dashboard';
  if (panel === 'SUBADMIN' || panel === 'EMPLOYEE') return '/subadmin/dashboard';
  return '/user/dashboard';
};

const normalizePanel = (panel) => {
  const p = String(panel || '').trim().toUpperCase();
  if (!p) return null;
  if (p === 'EMPLOYEE') return 'SUBADMIN';
  return p;
};

const inferPanel = ({ panel, user, organization }) => {
  const explicitPanel = normalizePanel(panel);
  if (explicitPanel) return explicitPanel;
  if (user?.isSuperAdmin) return 'SUPERADMIN';
  const role = String(organization?.role || '').trim().toLowerCase();
  if (role === 'owner') return 'OWNER';
  if (role) return 'SUBADMIN';
  if (organization?.id || organization?._id) return 'SUBADMIN';
  return 'USER';
};

const PanelRoute = ({ allowedPanels, children }) => {
  const state = useAuthStore();
  if (!state.isAuthenticated) return <Navigate to="/auth/login" replace />;

  const activePanel = inferPanel(state);
  if (!allowedPanels.includes(activePanel)) {
    return <Navigate to={getPanelHome(activePanel)} replace />;
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const state = useAuthStore();
  if (!state.isAuthenticated) return children;
  const activePanel = inferPanel(state);
  return <Navigate to={getPanelHome(activePanel)} replace />;
};

const PanelHomeRedirect = () => {
  const state = useAuthStore();
  if (!state.isAuthenticated) return <Navigate to="/auth/login" replace />;
  const activePanel = inferPanel(state);
  return <Navigate to={getPanelHome(activePanel)} replace />;
};

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Router>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
        </Route>

        <Route path="/auth" element={<AuthLayout />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>

        <Route
          path="/superadmin"
          element={<PanelRoute allowedPanels={['SUPERADMIN']}><SuperAdminLayout /></PanelRoute>}
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route
          path="/owner"
          element={<PanelRoute allowedPanels={['OWNER']}><OwnerLayout /></PanelRoute>}
        >
          <Route path="dashboard" element={<DashboardHome />} />
          <Route path="profile" element={<UserProfile />} />
          <Route path="organization" element={<OrganizationSettings />} />
          <Route path="employees" element={<EmployeeList />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="payroll" element={<PayrollPage />} />
          <Route path="recruitment" element={<RecruitmentDashboard />} />
          <Route path="org-chart" element={<OrgChartPage />} />
          <Route path="performance" element={<PerformancePage />} />
          <Route path="feed" element={<FeedPage />} />
          <Route path="network" element={<NetworkPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route
          path="/subadmin"
          element={<PanelRoute allowedPanels={['SUBADMIN']}><SubAdminLayout /></PanelRoute>}
        >
          <Route path="dashboard" element={<DashboardHome />} />
          <Route path="profile" element={<UserProfile />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="leaves" element={<LeavePage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="feed" element={<FeedPage />} />
          <Route path="network" element={<NetworkPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route
          path="/user"
          element={<PanelRoute allowedPanels={['USER']}><UserLayout /></PanelRoute>}
        >
          <Route path="dashboard" element={<DashboardHome />} />
          <Route path="profile" element={<UserProfile />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="feed" element={<FeedPage />} />
          <Route path="network" element={<NetworkPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="/employee/*" element={<Navigate to="/subadmin/dashboard" replace />} />

        <Route path="/dashboard" element={<PanelHomeRedirect />} />
        <Route path="/admin/dashboard" element={<Navigate to="/superadmin/dashboard" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {isAuthenticated && <AIWidget />}
    </Router>
  );
}

export default App;
