import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AdminLayout } from './components/layout/AdminLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { PromotersList } from './pages/promoters/PromotersList';
import { AddPromoter } from './pages/promoters/AddPromoter';
import { PromoterDetails } from './pages/promoters/PromoterDetails';
import { SalesList } from './pages/sales/SalesList';
import { SaleDetails } from './pages/sales/SaleDetails';
import { Announcements } from './pages/announcements/Announcements';
import { Logs } from './pages/logs/Logs';

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
            <Route path="/promoters/new" element={<AddPromoter />} />
            <Route path="/promoters/:id" element={<PromoterDetails />} />
            <Route path="/sales" element={<SalesList />} />
            <Route path="/sales/:id" element={<SaleDetails />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/logs" element={<Logs />} />
          </Route>
        </Routes>
      </Router>
    </ModalProvider>
  );
}

export default App;
