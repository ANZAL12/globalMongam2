import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Promoter, Sale } from '../../types';
import { logActivity } from '../../utils/logger';
import { useModal } from '../../context/ModalContext';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Store, 
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  History,
  ShieldCheck
} from 'lucide-react';

export function PromoterDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [promoter, setPromoter] = useState<Promoter | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const { showAlert, showConfirm } = useModal();

  useEffect(() => {
    async function fetchPromoterData() {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // Fetch promoter details
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*, approver:approver_id(full_name)')
          .eq('id', id)
          .single();

        if (userError) throw userError;
        setPromoter(userData);

        // Fetch promoter sales
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select('*')
          .eq('promoter_id', id)
          .order('created_at', { ascending: false });

        if (salesError) throw salesError;
        setSales(salesData || []);

      } catch (err) {
        console.error('Error fetching promoter details:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPromoterData();
  }, [id]);

  const toggleStatus = async () => {
    if (!promoter || !id) return;
    
    const newStatus = !(promoter as any).is_active;
    const action = newStatus ? 'enable' : 'disable';
    
    const confirmed = await showConfirm({
      title: `${newStatus ? 'Enable' : 'Disable'} Account?`,
      message: `Are you sure you want to ${action} this promoter account?`,
      severity: newStatus ? 'info' : 'warning'
    });
    
    if (!confirmed) return;

    setToggling(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: newStatus })
        .eq('id', id);

      if (error) throw error;
      await logActivity(
        newStatus ? 'Enable Promoter' : 'Disable Promoter', 
        `${newStatus ? 'Enabled' : 'Disabled'} account for ${promoter.full_name || promoter.email}`
      );
      setPromoter({ ...promoter, is_active: newStatus } as any);
      showAlert({
        title: 'Status Updated',
        message: `The promoter account has been ${newStatus ? 'enabled' : 'disabled'} successfully.`,
        severity: 'success'
      });
    } catch (err) {
      console.error('Error toggling status:', err);
      showAlert({
        title: 'Update Failed',
        message: 'There was an error updating the promoter status.',
        severity: 'error'
      });
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!promoter) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-gray-900">Promoter not found</h2>
        <button 
          onClick={() => navigate('/promoters')}
          className="mt-4 text-indigo-600 font-medium hover:underline"
        >
          Back to list
        </button>
      </div>
    );
  }

  const totalIncentives = sales
    .filter(s => s.payment_status === 'paid')
    .reduce((sum, s) => sum + parseFloat(s.incentive_amount || '0'), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/promoters')}
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all hover:shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Promoter Profile</h1>
            <p className="mt-1 text-sm text-gray-500">View and manage promoter performance and details.</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleStatus}
            disabled={toggling}
            className={`inline-flex items-center px-4 py-2 border rounded-xl shadow-sm text-sm font-bold transition-all active:scale-95 disabled:opacity-50 ${
              (promoter as any).is_active !== false
                ? 'bg-white border-rose-200 text-rose-600 hover:bg-rose-50'
                : 'bg-emerald-600 border-transparent text-white hover:bg-emerald-700'
            }`}
          >
            {(promoter as any).is_active !== false ? (
              <><XCircle className="-ml-1 mr-2 h-4 w-4" /> Disable Account</>
            ) : (
              <><CheckCircle2 className="-ml-1 mr-2 h-4 w-4" /> Enable Account</>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          {/* Profile Card */}
          <div className="bg-white shadow-sm border border-gray-100 rounded-3xl overflow-hidden p-8 text-center">
            <div className="mx-auto h-24 w-24 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-3xl font-bold mb-6">
              {promoter.full_name?.charAt(0) || promoter.email.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl font-bold text-gray-900">{promoter.full_name || 'No Name'}</h2>
            <p className="text-gray-500 font-medium mt-1 flex items-center justify-center">
              <Store className="h-4 w-4 mr-1.5 opacity-50" />
              {(promoter as any).shop_name || 'N/A'}
            </p>
            
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center ${
                (promoter as any).is_active !== false 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {(promoter as any).is_active !== false ? (
                  <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Active</>
                ) : (
                  <><AlertTriangle className="h-3.5 w-3.5 mr-1" /> Disabled</>
                )}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 flex items-center">
                <Calendar className="h-3.5 w-3.5 mr-1" />
                Joined {new Date(promoter.created_at).toLocaleDateString()}
              </span>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-50 space-y-4 text-left">
              <div className="flex items-center text-sm text-gray-600">
                <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 mr-3">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Email Address</p>
                  <p className="truncate font-medium">{promoter.email}</p>
                </div>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 mr-3">
                  <Phone className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Phone Number</p>
                  <p className="truncate font-medium">{(promoter as any).phone_number || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-400 mr-3">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Assigned Approver</p>
                  <p className="truncate font-bold text-indigo-600">{(promoter as any).approver?.full_name || 'Not Assigned'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-indigo-600 shadow-lg shadow-indigo-100 rounded-3xl p-8 text-white relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 h-24 w-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-700" />
            <div className="relative z-10">
              <TrendingUp className="h-8 w-8 mb-4 opacity-80" />
              <p className="text-indigo-100 font-medium text-sm">Lifetime Incentives Paid</p>
              <h3 className="text-4xl font-bold mt-1">₹{totalIncentives.toLocaleString()}</h3>
              <p className="text-indigo-200 text-xs mt-4 flex items-center capitalize">
                From {sales.filter(s => s.payment_status === 'paid').length} successful sales
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          {/* Sales History */}
          <div className="bg-white shadow-sm border border-gray-100 rounded-3xl overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-indigo-600">
                  <History className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Incentives & Rewards History</h2>
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{sales.length} Total Sales</span>
            </div>
            
            <div className="divide-y divide-gray-50">
              {sales.map((sale) => (
                <div 
                  key={sale.id} 
                  className="px-8 py-6 hover:bg-gray-50/50 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/sales/${sale.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{sale.product_name}</h3>
                        <ChevronRight className="h-3 w-3 text-gray-300 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-xs text-gray-500">
                        {sale.model_no ? `Model: ${sale.model_no}` : ''} 
                        {sale.serial_no ? ` | Serial: ${sale.serial_no}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">₹{sale.bill_amount}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{new Date(sale.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-4 items-center">
                    <div className="flex items-center text-[10px] space-x-1.5">
                      <span className="font-bold text-gray-400 uppercase tracking-wider">Status:</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${
                        sale.status === 'approved' || sale.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : sale.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {sale.status}
                      </span>
                    </div>

                    <div className="flex items-center text-[10px] space-x-1.5">
                      <span className="font-bold text-gray-400 uppercase tracking-wider">Payment:</span>
                      <span className={`font-bold uppercase ${
                        sale.payment_status === 'paid' ? 'text-emerald-600' : 'text-gray-400'
                      }`}>
                        {sale.payment_status}
                      </span>
                      {sale.payment_status === 'paid' && sale.paid_at && (
                        <span className="text-gray-500 ml-2">
                          • {new Date(sale.paid_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <div className="ml-auto flex items-center text-[10px] space-x-1.5">
                      <span className="font-bold text-gray-400 uppercase tracking-wider">Incentive:</span>
                      <span className="font-bold text-emerald-600 text-xs">₹{sale.incentive_amount || '0.00'}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {sales.length === 0 && (
                <div className="py-20 text-center text-gray-400 space-y-4">
                  <History className="h-12 w-12 mx-auto opacity-10" />
                  <p className="text-sm font-medium">No sales history found for this promoter.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
