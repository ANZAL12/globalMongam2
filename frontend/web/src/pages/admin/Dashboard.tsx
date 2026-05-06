import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';

type Sale = {
    id: string; // UUID
    status: string;
    payment_status: string;
};

export default function AdminDashboard() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSales = async () => {
            try {
                const { data, error } = await supabase
                    .from('sales')
                    .select('id, status, payment_status');
                
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

    const totalSalesCount = sales.length;
    const pendingCount = sales.filter((s) => s.status === 'pending').length;
    const approverApprovedCount = sales.filter((s) => s.status === 'approver_approved').length;
    const paidCount = sales.filter((s) => s.payment_status === 'paid').length;

    if (loading) {
        return (
            <div className="flex flex-1 justify-center items-center h-full">
                <div className="w-8 h-8 border-4 border-[#1976d2] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-[20px] bg-[#f5f5f5]">
            <h1 className="text-[24px] font-bold text-[#333] mb-[20px]">Admin Overview</h1>

            <div className="flex flex-col gap-[15px]">
                {/* Total Sales */}
                <div className="bg-white p-[20px] rounded-[10px] shadow-[0_5px_5px_rgba(0,0,0,0.1)] border-l-[5px] border-l-[#1976d2]">
                    <h2 className="text-[16px] text-[#666] mb-[5px]">Total Sales Submitted</h2>
                    <p className="text-[28px] font-bold text-[#333]">{totalSalesCount}</p>
                </div>

                {/* Pending */}
                <div className="bg-white p-[20px] rounded-[10px] shadow-[0_5px_5px_rgba(0,0,0,0.1)] border-l-[5px] border-l-[#ff9800]">
                    <h2 className="text-[16px] text-[#666] mb-[5px]">Waiting for Approver</h2>
                    <p className="text-[28px] font-bold text-[#333]">{pendingCount}</p>
                </div>

                {/* Approved */}
                <div className="bg-white p-[20px] rounded-[10px] shadow-[0_5px_5px_rgba(0,0,0,0.1)] border-l-[5px] border-l-[#4caf50]">
                    <h2 className="text-[16px] text-[#666] mb-[5px]">Approved by Approver</h2>
                    <p className="text-[28px] font-bold text-[#333]">{approverApprovedCount}</p>
                </div>

                {/* Paid */}
                <div className="bg-white p-[20px] rounded-[10px] shadow-[0_5px_5px_rgba(0,0,0,0.1)] border-l-[5px] border-l-[#9c27b0]">
                    <h2 className="text-[16px] text-[#666] mb-[5px]">Incentives Paid</h2>
                    <p className="text-[28px] font-bold text-[#333]">{paidCount}</p>
                </div>
            </div>
        </div>
    );
}
