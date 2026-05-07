import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './components/layout/AdminLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { PromotersList } from './pages/promoters/PromotersList';
import { AddPromoter } from './pages/promoters/AddPromoter';
import { PendingPromoters } from './pages/promoters/PendingPromoters';
import { PendingPromoterDetails } from './pages/promoters/PendingPromoterDetails';
import { PromoterDetails } from './pages/promoters/PromoterDetails';
import { PromoterManage } from './pages/promoters/PromoterManage';
import { EditPromoter } from './pages/promoters/EditPromoter';
import { ApproversList } from './pages/approvers/ApproversList';
import { AddApprover } from './pages/approvers/AddApprover';
import { ApproverDetails } from './pages/approvers/ApproverDetails';
import { SalesList } from './pages/sales/SalesList';
import { SaleDetails } from './pages/sales/SaleDetails';
import { DuplicateSerialSales } from './pages/sales/DuplicateSerialSales';
import { ApproverAnnouncements, PromoterAnnouncements } from './pages/announcements/Announcements';
import { Logs } from './pages/logs/Logs';
import { MediaLibrary } from './pages/MediaLibrary';

import { ModalProvider } from './context/ModalContext';

function App() {
  return (
    <ModalProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<AdminLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/promoters" element={<PromotersList />} />
            <Route path="/promoters/pending" element={<PendingPromoters />} />
            <Route path="/promoters/pending/:id" element={<PendingPromoterDetails />} />
            <Route path="/promoters/manage" element={<PromoterManage />} />
            <Route path="/promoters/new" element={<AddPromoter />} />
            <Route path="/promoters/:id/edit" element={<EditPromoter />} />
            <Route path="/promoters/:id" element={<PromoterDetails />} />
            <Route path="/approvers" element={<ApproversList />} />
            <Route path="/approvers/new" element={<AddApprover />} />
            <Route path="/approvers/:id" element={<ApproverDetails />} />
            <Route path="/sales" element={<SalesList />} />
            <Route path="/sales/:id" element={<SaleDetails />} />
            <Route path="/sales/duplicates" element={<DuplicateSerialSales />} />
            <Route path="/announcements" element={<Navigate to="/announcements/promoters" replace />} />
            <Route path="/announcements/promoters" element={<PromoterAnnouncements />} />
            <Route path="/announcements/approvers" element={<ApproverAnnouncements />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/media" element={<MediaLibrary />} />
          </Route>
        </Routes>
      </Router>
    </ModalProvider>
  );
}

export default App;
