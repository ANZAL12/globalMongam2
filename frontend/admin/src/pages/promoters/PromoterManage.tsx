import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Promoter } from '../../types';
import {
  UserPlus,
  Search,
  Mail,
  Phone,
  CreditCard,
  Edit,
  Building2
} from 'lucide-react';

export function PromoterManage() {
  const navigate = useNavigate();
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchPromoters() {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('role', 'promoter')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPromoters(data || []);
      } catch (err) {
        console.error('Error fetching promoters:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPromoters();
  }, []);

  const filteredPromoters = promoters.filter(p => 
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.shop_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Manage Promoters</h1>
          <p className="mt-1 text-sm text-gray-500">View and edit promoter profiles.</p>
        </div>
        <Link
          to="/promoters/new"
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-95"
        >
          <UserPlus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Add Promoter
        </Link>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden p-6 mb-8">
        <div className="relative max-w-xl">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
            placeholder="Search promoters by name, email or place..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPromoters.map((promoter) => (
          <div 
            key={promoter.id}
            className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col group cursor-pointer"
            onClick={() => navigate(`/promoters/${promoter.id}/edit`)}
          >
            <div className="p-6 flex-1 relative">
              <div className="absolute top-6 right-6">
                 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    (promoter as any).is_active !== false 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {(promoter as any).is_active !== false ? 'Active' : 'Inactive'}
                  </span>
              </div>
              <div className="flex items-center space-x-4 mb-4">
                <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100 text-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  {promoter.full_name?.charAt(0) || promoter.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors">
                    {promoter.full_name || 'No Name'}
                  </h3>
                  <div className="text-xs text-gray-500 font-medium mt-1 flex items-center">
                    <Building2 className="h-3 w-3 mr-1" />
                    {promoter.shop_name || 'No Place Assigned'}
                  </div>
                </div>
              </div>

              <div className="space-y-3 mt-6">
                <div className="flex items-center text-sm text-gray-600">
                  <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 mr-3">
                    <Mail className="h-4 w-4" />
                  </div>
                  <span className="truncate">{promoter.email}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 mr-3">
                    <Phone className="h-4 w-4" />
                  </div>
                  <span>{promoter.phone_number || 'N/A'}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 mr-3">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <span>{promoter.gpay_number || 'N/A'}</span>
                </div>
              </div>
            </div>
            
            <div className="promoter-edit-footer px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between group-hover:bg-indigo-50 transition-colors">
               <span className="promoter-edit-label text-xs font-semibold text-gray-500 group-hover:text-indigo-600">Click to Edit</span>
               <button className="promoter-edit-icon h-8 w-8 rounded-full bg-white flex items-center justify-center text-gray-400 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Edit className="h-4 w-4" />
               </button>
            </div>
          </div>
        ))}
      </div>

      {filteredPromoters.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 border-dashed">
          <div className="flex flex-col items-center">
            <Search className="h-12 w-12 text-gray-200 mb-4" />
            <h3 className="text-lg font-bold text-gray-900">No promoters found</h3>
            <p className="text-gray-500 mt-1">Try adjusting your search terms.</p>
          </div>
        </div>
      )}
    </div>
  );
}
