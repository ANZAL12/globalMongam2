import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Sale } from '../../types';
import { 
  Search, 
  ShoppingBag, 
  Calendar, 
  User, 
  ArrowUpRight,
  Filter,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function SalesList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const initialStatus = searchParams.get('status') || 'all';
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const navigate = useNavigate();

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setStatusFilter(newStatus);
    if (newStatus === 'all') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', newStatus);
    }
    setSearchParams(searchParams, { replace: true });
  };

  useEffect(() => {
    async function fetchSales() {
      try {
        const { data, error } = await supabase
          .from('sales')
          .select(`
            *,
            promoter:users!sales_promoter_id_fkey (
              email
            )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const mappedSales = (data || []).map((sale: any) => ({
          ...sale,
          promoter_email: sale.promoter?.email || 'Unknown',
        }));

        setSales(mappedSales);
      } catch (err) {
        console.error('Error fetching sales:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSales();
  }, []);

  const filteredSales = sales.filter(s => {
    const matchesSearch = 
      s.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.promoter_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.bill_no?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Sales Management</h1>
        <p className="mt-1 text-sm text-gray-500">Monitor and manage all sales submissions from promoters.</p>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-3xl overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-50 bg-gray-50/50 flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search sales, promoters, or bill numbers..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400 mr-1" />
            <select
              className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              value={statusFilter}
              onChange={handleStatusChange}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-white">
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Product & Bill</th>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Promoter</th>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {filteredSales.map((sale) => (
                <tr 
                  key={sale.id} 
                  className="hover:bg-gray-50 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/sales/${sale.id}`)}
                >
                  <td className="px-8 py-5 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mr-4 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm border border-indigo-100">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{sale.product_name}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Bill: {sale.bill_no || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-600 font-medium">
                      <User className="h-4 w-4 mr-2 text-gray-400" />
                      {sale.promoter_email}
                    </div>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900 italic-none">₹{parseFloat(sale.bill_amount).toLocaleString()}</div>
                    {sale.incentive_amount && (
                      <div className="text-[10px] text-emerald-600 font-bold tracking-tight">
                        + ₹{sale.incentive_amount} Incentive
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      sale.status === 'approved' || sale.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : sale.status === 'rejected'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {sale.status === 'approved' || sale.status === 'paid' ? (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      ) : sale.status === 'rejected' ? (
                        <XCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <Clock className="h-3 w-3 mr-1" />
                      )}
                      {sale.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <div className="flex items-center text-xs text-gray-500 font-medium">
                      <Calendar className="h-3.5 w-3.5 mr-1.5 text-gray-300" />
                      {new Date(sale.created_at).toLocaleDateString()}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400 gap-2">
                      <ShoppingBag className="h-12 w-12 opacity-10" />
                      <p className="text-sm font-medium">No sales records found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
