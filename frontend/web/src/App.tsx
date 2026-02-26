import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import AdminDashboard from './pages/admin/Dashboard';
import PromoterDashboard from './pages/promoter/Dashboard';
import PromoterUploadSale from './pages/promoter/UploadSale';
import PromoterSales from './pages/promoter/Sales';
import PromoterAnnouncements from './pages/promoter/Announcements';
import AdminSales from './pages/admin/Sales';
import AdminAnnouncements from './pages/admin/Announcements';
import AdminPromoters from './pages/admin/Promoters';
import AdminSaleDetail from './pages/admin/SaleDetail';
import AdminPromoterDetail from './pages/admin/PromoterDetail';
import AdminAddPromoter from './pages/admin/AddPromoter';

function ProtectedRoute({ children, allowedRole }: { children: JSX.Element, allowedRole: string }) {
  const token = localStorage.getItem('access');
  const role = localStorage.getItem('role');

  if (!token) return <Navigate to="/" replace />;
  if (role !== allowedRole) return <Navigate to={`/${role}`} replace />;

  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRole="admin">
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="sales" element={<AdminSales />} />
        <Route path="sale/:id" element={<AdminSaleDetail />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="promoters" element={<AdminPromoters />} />
        <Route path="add-promoter" element={<AdminAddPromoter />} />
        <Route path="promoter/:id" element={<AdminPromoterDetail />} />
      </Route>

      {/* Promoter Routes */}
      <Route path="/promoter" element={
        <ProtectedRoute allowedRole="promoter">
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<PromoterDashboard />} />
        <Route path="add-sale" element={<PromoterUploadSale />} />
        <Route path="sales" element={<PromoterSales />} />
        <Route path="announcements" element={<PromoterAnnouncements />} />
      </Route>
    </Routes>
  );
}

export default App;
