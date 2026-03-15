import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';

type PromoterSale = {
    id: string; // UUID
    status: string;
    payment_status: string;
    incentive_amount?: string;
};

export default function PromoterDashboard() {
    const [sales, setSales] = useState<PromoterSale[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSales = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                
                const { data, error } = await supabase
                    .from('sales')
                    .select('id, status, payment_status, incentive_amount')
                    .eq('promoter_id', user.id);
                
                if (error) throw error;
                setSales(data || []);
            } catch (error) {
                console.error('Failed to fetch sales', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSales();
    }, []);

    const totalSales = sales.length;
    const pendingCount = sales.filter((s) => s.status === 'pending').length;
    const approvedCount = sales.filter((s) => s.status === 'approved' || s.status === 'paid').length;
    const totalIncentive = sales
        .filter((s) => s.status === 'approved' || s.status === 'paid')
        .reduce((sum, s) => sum + parseFloat(s.incentive_amount || '0'), 0);

    if (loading) {
        return (
            <div className="flex flex-1 justify-center items-center h-full">
                <div className="w-8 h-8 border-4 border-[#1976d2] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-[20px] bg-[#f5f5f5]">
            <h1 className="text-[24px] font-bold text-[#333] mb-[20px]">Promoter Overview</h1>

            <div className="flex flex-col gap-[15px]">
                {/* Total Sales */}
                <div className="bg-white p-[20px] rounded-[10px] shadow-[0_5px_5px_rgba(0,0,0,0.1)] border-l-[5px] border-l-[#1976d2]">
                    <h2 className="text-[16px] text-[#666] mb-[5px]">Total Sales Submitted</h2>
                    <p className="text-[28px] font-bold text-[#333]">{totalSales}</p>
                </div>

                {/* Pending */}
                <div className="bg-white p-[20px] rounded-[10px] shadow-[0_5px_5px_rgba(0,0,0,0.1)] border-l-[5px] border-l-[#ff9800]">
                    <h2 className="text-[16px] text-[#666] mb-[5px]">Pending Approval</h2>
                    <p className="text-[28px] font-bold text-[#333]">{pendingCount}</p>
                </div>

                {/* Approved */}
                <div className="bg-white p-[20px] rounded-[10px] shadow-[0_5px_5px_rgba(0,0,0,0.1)] border-l-[5px] border-l-[#4caf50]">
                    <h2 className="text-[16px] text-[#666] mb-[5px]">Total Approved</h2>
                    <p className="text-[28px] font-bold text-[#333]">{approvedCount}</p>
                </div>

                {/* Commission */}
                <div className="bg-white p-[20px] rounded-[10px] shadow-[0_5px_5px_rgba(0,0,0,0.1)] border-l-[5px] border-l-[#9c27b0]">
                    <h2 className="text-[16px] text-[#666] mb-[5px]">Total Incentives Earned</h2>
                    <p className="text-[28px] font-bold text-[#333]">₹{totalIncentive.toFixed(2)}</p>
                </div>
            </div>
        </div>
    );
}
