import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute, RoleRoute } from './components/RoleGuard';
import { AdjustmentsPage } from './pages/adjustments/AdjustmentsPage';
import { BatchListPage } from './pages/attendance/BatchListPage';
import { BatchReviewPage } from './pages/attendance/BatchReviewPage';
import { MarkAttendancePage } from './pages/attendance/MarkAttendancePage';
import { AuditLogsPage } from './pages/audit/AuditLogsPage';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { EmployeeProfilePage } from './pages/employees/EmployeeProfilePage';
import { EmployeesPage } from './pages/employees/EmployeesPage';
import { PayrollDetailPage } from './pages/payroll/PayrollDetailPage';
import { PayrollPage } from './pages/payroll/PayrollPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { SettingsPage } from './pages/settings/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="employees/:id" element={<EmployeeProfilePage />} />

        <Route
          path="attendance/mark"
          element={
            <RoleRoute allowedRoles={['SUB_SUPERVISOR']}>
              <MarkAttendancePage />
            </RoleRoute>
          }
        />
        <Route path="attendance/batches" element={<BatchListPage />} />
        <Route path="attendance/batches/:id" element={<BatchReviewPage />} />

        <Route
          path="adjustments"
          element={
            <RoleRoute allowedRoles={['OWNER']}>
              <AdjustmentsPage />
            </RoleRoute>
          }
        />
        <Route
          path="payroll"
          element={
            <RoleRoute allowedRoles={['OWNER']}>
              <PayrollPage />
            </RoleRoute>
          }
        />
        <Route
          path="payroll/:id"
          element={
            <RoleRoute allowedRoles={['OWNER']}>
              <PayrollDetailPage />
            </RoleRoute>
          }
        />

        <Route path="reports" element={<ReportsPage />} />

        <Route
          path="audit-logs"
          element={
            <RoleRoute allowedRoles={['OWNER']}>
              <AuditLogsPage />
            </RoleRoute>
          }
        />
        <Route
          path="settings"
          element={
            <RoleRoute allowedRoles={['OWNER']}>
              <SettingsPage />
            </RoleRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
