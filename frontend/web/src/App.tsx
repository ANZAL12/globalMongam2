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
import AdminLogs from './pages/admin/Logs';
import ApproverSales from './pages/approver/Sales';
import ApproverSaleDetail from './pages/approver/SaleDetail';
import { useEffect, useState } from 'react';
import { supabase } from './services/supabase';

function ProtectedRoute({ children, allowedRole }: { children: JSX.Element, allowedRole: string }) {
  const token = localStorage.getItem('access');
  const role = localStorage.getItem('role');
  const [checking, setChecking] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkMustChangePassword = async () => {
      if (!token) {
        if (mounted) setChecking(false);
        return;
      }

      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          localStorage.removeItem('access');
          localStorage.removeItem('role');
          if (mounted) {
            setMustChangePassword(false);
          }
          return;
        }

        const { data, error } = await supabase
          .from('users')
          .select('must_change_password')
          .eq('id', user.id)
          .single();

        if (error) {
          if (mounted) setMustChangePassword(false);
          return;
        }

        if (mounted) setMustChangePassword(Boolean(data?.must_change_password));
      } finally {
        if (mounted) setChecking(false);
      }
    };

    void checkMustChangePassword();
    return () => {
      mounted = false;
    };
  }, [token]);

  if (!token) return <Navigate to="/" replace />;
  if (checking) return null;
  if (mustChangePassword) return <Navigate to="/" replace />;
  if (!role) return <Navigate to="/" replace />;
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
        <Route path="logs" element={<AdminLogs />} />
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

      {/* Approver Routes */}
      <Route path="/approver" element={
        <ProtectedRoute allowedRole="approver">
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<ApproverSales />} />
        <Route path="sales" element={<ApproverSales />} />
        <Route path="sale/:id" element={<ApproverSaleDetail />} />
      </Route>
    </Routes>
  );
}

export default App;
