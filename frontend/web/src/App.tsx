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
import DuplicateSerialSales from './pages/approver/DuplicateSerialSales';
import ApproverDashboard from './pages/approver/Dashboard';
import ApproverAddPromoter from './pages/approver/AddPromoter';
import ApproverAnnouncements from './pages/approver/Announcements';
import ApproverAnnouncementDetail from './pages/approver/AnnouncementDetail';
import ApproverMyPromoters from './pages/approver/MyPromoters';
import ApproverPromoterDetail from './pages/approver/PromoterDetail';
import PromoterAnnouncementDetail from './pages/promoter/AnnouncementDetail';
import { useEffect, useState } from 'react';
import { supabase } from './services/supabase';
import { startForegroundPushListener, syncWebPushToken } from './services/firebaseMessaging';

const ALLOWED_ROLES = new Set(['admin', 'promoter', 'approver']);

function ProtectedRoute({ children, allowedRole }: { children: JSX.Element, allowedRole: string }) {
  const token = localStorage.getItem('access');
  let role = localStorage.getItem('role');
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
          .select('role, must_change_password, is_active')
          .eq('id', user.id)
          .single();

        if (error || !data?.role || !data?.is_active || !ALLOWED_ROLES.has(data.role)) {
          await supabase.auth.signOut();
          localStorage.removeItem('access');
          localStorage.removeItem('role');
          if (mounted) setMustChangePassword(false);
          return;
        }

        if (data.role !== role) {
          localStorage.setItem('role', data.role);
          role = data.role;
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

  useEffect(() => {
    if (!token || checking || mustChangePassword || !role || role !== allowedRole || role === 'admin') return;

    void syncWebPushToken();
    void startForegroundPushListener();
  }, [allowedRole, checking, mustChangePassword, role, token]);

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
        <Route path="details/:id" element={<PromoterAnnouncementDetail />} />
      </Route>

      {/* Approver Routes */}
      <Route path="/approver" element={
        <ProtectedRoute allowedRole="approver">
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<ApproverDashboard />} />
        <Route path="sales" element={<ApproverSales />} />
        <Route path="sale/:id" element={<ApproverSaleDetail />} />
        <Route path="sale/duplicates" element={<DuplicateSerialSales />} />
        <Route path="add-promoter" element={<ApproverAddPromoter />} />
        <Route path="my-promoters" element={<ApproverMyPromoters />} />
        <Route path="promoter/:id" element={<ApproverPromoterDetail />} />
        <Route path="announcements" element={<ApproverAnnouncements />} />
        <Route path="details/:id" element={<ApproverAnnouncementDetail />} />
      </Route>
    </Routes>
  );
}

export default App;
