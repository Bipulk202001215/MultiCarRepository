import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { PERMISSIONS } from './lib/permissions';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import JobsBoardPage from './pages/jobs/JobsBoardPage';
import JobDetailPage from './pages/jobs/JobDetailPage';
import JobCardViewPage from './pages/jobs/JobCardViewPage';
import CreateJobPage from './pages/jobs/CreateJobPage';
import JobsListPage from './pages/jobs/JobsListPage';
import InventoryPage from './pages/inventory/InventoryPage';
import PurchaseOrdersPage from './pages/inventory/PurchaseOrdersPage';
import SuppliersPage from './pages/inventory/SuppliersPage';
import InvoicesPage from './pages/invoices/InvoicesPage';
import InvoiceViewPage from './pages/invoices/InvoiceViewPage';
import CreateInvoicePage from './pages/invoices/CreateInvoicePage';
import UsersManagementPage from './pages/admin/UsersManagementPage';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs/board"
          element={
            <ProtectedRoute>
              <JobsBoardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs/create"
          element={
            <ProtectedRoute>
              <CreateJobPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs/list"
          element={
            <ProtectedRoute>
              <JobsListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs/:jobId"
          element={
            <ProtectedRoute>
              <CreateJobPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs/:jobId/view"
          element={
            <ProtectedRoute>
              <JobCardViewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedRoute allowedPermissions={[PERMISSIONS.INVENTORY_MANAGEMENT]}>
              <InventoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory/purchase-orders"
          element={
            <ProtectedRoute>
              <PurchaseOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory/suppliers"
          element={
            <ProtectedRoute>
              <SuppliersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices"
          element={
            <ProtectedRoute>
              <InvoicesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices/create"
          element={
            <ProtectedRoute>
              <CreateInvoicePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices/:invoiceId"
          element={
            <ProtectedRoute>
              <InvoiceViewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <UsersManagementPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;

