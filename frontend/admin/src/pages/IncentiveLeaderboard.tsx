import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Trophy, 
  Users, 
  Search, 
  Filter, 
  TrendingUp, 
  Medal, 
  ChevronRight,
  ArrowUpRight,
  User,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type LeaderboardEntry = {
  promoter_id: string;
  promoter_name: string;
  promoter_email: string;
  shop_name: string | null;
  approver_id: string | null;
  approver_name: string | null;
  total_incentive: number;
  sales_count: number;
};

export function IncentiveLeaderboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [approvers, setApprovers] = useState<{id: string, full_name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApprover, setSelectedApprover] = useState('all');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch all sales that are paid
        const { data: sales, error: salesError } = await supabase
          .from('sales')
          .select(`
            id,
            incentive_amount,
            payment_status,
            promoter_id,
            promoter:users!sales_promoter_id_fkey (
              id,
              full_name,
              email,
              shop_name,
              approver_id,
              approver:approver_id (
                id,
                full_name
              )
            )
          `)
          .eq('payment_status', 'paid');

        if (salesError) throw salesError;

        // Fetch all approvers for the filter
        const { data: approverList, error: approverError } = await supabase
          .from('users')
          .select('id, full_name')
          .eq('role', 'approver');

        if (approverError) throw approverError;
        setApprovers(approverList || []);

        // Group by promoter
        const promoterMap = new Map<string, LeaderboardEntry>();

        (sales || []).forEach((sale: any) => {
          const promoter = sale.promoter;
          if (!promoter) return;

          const existing = promoterMap.get(promoter.id) || {
            promoter_id: promoter.id,
            promoter_name: promoter.full_name || 'No Name',
            promoter_email: promoter.email,
            shop_name: promoter.shop_name,
            approver_id: promoter.approver_id,
            approver_name: promoter.approver?.full_name || 'Not Assigned',
            total_incentive: 0,
            sales_count: 0
          };

          existing.total_incentive += parseFloat(sale.incentive_amount || '0');
          existing.sales_count += 1;
          promoterMap.set(promoter.id, existing);
        });

        // Convert map to array and sort by incentive
        const sortedData = Array.from(promoterMap.values()).sort((a, b) => b.total_incentive - a.total_incentive);
        setData(sortedData);

      } catch (err) {
        console.error('Error fetching leaderboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredData = data.filter(item => {
    const matchesSearch = 
      item.promoter_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.promoter_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.shop_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesApprover = selectedApprover === 'all' || item.approver_id === selectedApprover;
    
    return matchesSearch && matchesApprover;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Generating Leaderboard...</p>
      </div>
    );
  }

  const topThree = filteredData.slice(0, 3);
  const others = filteredData.slice(3);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center">
            <Trophy className="h-7 w-7 mr-3 text-amber-500" />
            Incentive Leaderboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 font-medium">Tracking the most successful promoters and their rewards.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Search promoters..."
              className="pl-10 pr-4 py-2.5 rounded-xl bg-white border border-gray-100 shadow-sm focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-500 outline-none text-sm font-bold transition-all w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative group">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            <select
              className="pl-10 pr-8 py-2.5 rounded-xl bg-white border border-gray-100 shadow-sm focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-500 outline-none text-sm font-bold transition-all appearance-none cursor-pointer"
              value={selectedApprover}
              onChange={(e) => setSelectedApprover(e.target.value)}
            >
              <option value="all">All Approvers</option>
              {approvers.map(a => (
                <option key={a.id} value={a.id}>{a.full_name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Podium for Top 3 */}
      {filteredData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {topThree.map((item, index) => (
            <div 
              key={item.promoter_id}
              className={`relative bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl shadow-indigo-100/50 flex flex-col items-center text-center group cursor-pointer hover:-translate-y-2 transition-all duration-300 ${
                index === 0 ? 'md:order-2 border-amber-100 bg-gradient-to-b from-amber-50/30 to-white' : index === 1 ? 'md:order-1' : 'md:order-3'
              }`}
              onClick={() => navigate(`/promoters/${item.promoter_id}`)}
            >
              <div className="absolute top-6 right-6">
                <Medal className={`h-8 w-8 ${
                  index === 0 ? 'text-amber-500' : index === 1 ? 'text-gray-400' : 'text-amber-700'
                }`} />
              </div>
              
              <div className={`h-24 w-24 rounded-3xl mb-6 flex items-center justify-center text-3xl font-black shadow-lg ${
                index === 0 ? 'bg-amber-100 text-amber-600' : index === 1 ? 'bg-gray-100 text-gray-600' : 'bg-amber-50 text-amber-800'
              }`}>
                {item.promoter_name.charAt(0)}
              </div>
              
              <h3 className="text-xl font-black text-gray-900 tracking-tight mb-1">{item.promoter_name}</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{item.shop_name || 'Individual'}</p>
              
              <div className="w-full pt-6 border-t border-gray-50 flex items-center justify-between">
                <div className="text-left">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Earned</p>
                  <p className="text-xl font-black text-indigo-600">₹{item.total_incentive.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sales</p>
                  <p className="text-xl font-black text-gray-900">{item.sales_count}</p>
                </div>
              </div>
              
              <div className="mt-6 flex items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <ShieldCheck className="h-3 w-3 mr-1.5 opacity-40" />
                Approver: {item.approver_name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main List */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
          <div className="flex items-center space-x-3">
             <div className="h-10 w-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-indigo-600">
               <TrendingUp className="h-5 w-5" />
             </div>
             <h2 className="text-lg font-black text-gray-900">Performance Ranking</h2>
          </div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{filteredData.length} Promoters Ranked</span>
        </div>

        <div className="divide-y divide-gray-50">
          {others.map((item, index) => (
            <div 
              key={item.promoter_id}
              className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors group cursor-pointer"
              onClick={() => navigate(`/promoters/${item.promoter_id}`)}
            >
              <div className="flex items-center space-x-6">
                <div className="text-sm font-black text-gray-300 w-6">#{index + 4}</div>
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 font-bold group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-black text-gray-900">{item.promoter_name}</span>
                      <span className="text-[10px] font-bold text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                         <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 font-medium italic">{item.promoter_email}</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-12">
                <div className="hidden md:block text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Assigned Approver</p>
                  <div className="flex items-center justify-end text-xs font-bold text-gray-700">
                    <ShieldCheck className="h-3 w-3 mr-1.5 text-indigo-400" />
                    {item.approver_name}
                  </div>
                </div>

                <div className="text-right min-w-[100px]">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total Payout</p>
                  <div className="text-lg font-black text-indigo-600">₹{item.total_incentive.toLocaleString()}</div>
                </div>
              </div>
            </div>
          ))}

          {filteredData.length === 0 && (
             <div className="py-20 text-center text-gray-400 flex flex-col items-center">
               <Users className="h-12 w-12 opacity-10 mb-4" />
               <p className="text-sm font-black uppercase tracking-widest">No data available for these filters</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
