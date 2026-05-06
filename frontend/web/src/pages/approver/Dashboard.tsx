import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';

type Sale = {
    id: string;
    status: string;
};

export default function ApproverDashboard() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSales = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: promoters, error: promotersError } = await supabase
                    .from('users')
                    .select('id')
                    .eq('role', 'promoter')
                    .eq('approver_id', user.id)
                    .eq('is_active', true);

                if (promotersError) throw promotersError;

                const promoterIds = (promoters || []).map((promoter: any) => promoter.id);
                if (promoterIds.length === 0) {
                    setSales([]);
                    return;
                }

                const { data, error } = await supabase
                    .from('sales')
                    .select('id, status')
                    .in('promoter_id', promoterIds);

                if (error) throw error;
                setSales(data || []);
            } catch (error) {
                console.error('Failed to fetch sales for approver dashboard', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSales();
    }, []);

    const totalCount = sales.length;
    const pendingCount = sales.filter((s) => s.status === 'pending').length;
    const approvedByYouCount = sales.filter((s) => s.status === 'approver_approved').length;
    const rejectedCount = sales.filter((s) => s.status === 'rejected').length;

    if (loading) {
        return (
            <div className="flex flex-1 justify-center items-center h-full">
                <div className="w-8 h-8 border-4 border-[#1976d2] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-[20px] bg-[#f5f5f5]">
            <h1 className="text-[24px] font-bold text-[#333] mb-[20px]">Approver Overview</h1>

            <div className="flex flex-col gap-[15px]">
                <div className="bg-white p-[20px] rounded-[10px] shadow-[0_5px_5px_rgba(0,0,0,0.1)] border-l-[5px] border-l-[#1976d2]">
                    <h2 className="text-[16px] text-[#666] mb-[5px]">Assigned Sales</h2>
                    <p className="text-[28px] font-bold text-[#333]">{totalCount}</p>
                </div>

                <div className="bg-white p-[20px] rounded-[10px] shadow-[0_5px_5px_rgba(0,0,0,0.1)] border-l-[5px] border-l-[#ff9800]">
                    <h2 className="text-[16px] text-[#666] mb-[5px]">Pending Review</h2>
                    <p className="text-[28px] font-bold text-[#333]">{pendingCount}</p>
                </div>

                <div className="bg-white p-[20px] rounded-[10px] shadow-[0_5px_5px_rgba(0,0,0,0.1)] border-l-[5px] border-l-[#4caf50]">
                    <h2 className="text-[16px] text-[#666] mb-[5px]">Approved by You</h2>
                    <p className="text-[28px] font-bold text-[#333]">{approvedByYouCount}</p>
                </div>

                <div className="bg-white p-[20px] rounded-[10px] shadow-[0_5px_5px_rgba(0,0,0,0.1)] border-l-[5px] border-l-[#f44336]">
                    <h2 className="text-[16px] text-[#666] mb-[5px]">Rejected</h2>
                    <p className="text-[28px] font-bold text-[#333]">{rejectedCount}</p>
                </div>
            </div>
        </div>
    );
}
