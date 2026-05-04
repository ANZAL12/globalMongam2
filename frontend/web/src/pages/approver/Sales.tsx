import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';

type Sale = {
    id: string;
    promoter_email: string;
    product_name: string;
    model_no: string | null;
    serial_no: string | null;
    bill_no: string | null;
    bill_amount: string;
    status: string;
    payment_status: string;
    created_at: string;
};

export default function ApproverSales() {
    const navigate = useNavigate();
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSales = async () => {
        try {
            const { data, error } = await supabase
                .from('sales')
                .select(`
                    *,
                    promoter:users!promoter_id(email)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formattedSales = (data || []).map((sale: any) => ({
                ...sale,
                promoter_email: sale.promoter?.email || 'Unknown'
            }));

            setSales(formattedSales);
        } catch (error) {
            console.error('Failed to fetch sales', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSales();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approver_approved':
            case 'approved': return '#4caf50';
            case 'rejected': return '#f44336';
            case 'pending': return '#ff9800';
            default: return '#888';
        }
    };

    if (loading) {
        return (
            <div className="flex flex-1 justify-center items-center h-full bg-[#f5f5f5]">
                <div className="w-8 h-8 border-4 border-[#1976d2] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-[#f5f5f5] min-h-[calc(100vh-130px)] pb-[80px]">
            <div className="p-4 bg-white border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">Review Sales</h2>
                <p className="text-sm text-gray-500">Sales from your assigned promoters</p>
            </div>

            {sales.length === 0 ? (
                <div className="p-[40px] flex items-center justify-center">
                    <p className="text-[16px] text-[#888]">No sales found for review.</p>
                </div>
            ) : (
                <div className="flex flex-col">
                    {sales.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => navigate(`/approver/sale/${item.id}`)}
                            className="bg-white mx-[15px] mt-[15px] p-[15px] rounded-[8px] shadow-[0_2px_3px_rgba(0,0,0,0.1)] cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                        >
                            <div className="flex flex-row justify-between mb-[5px]">
                                <div>
                                    <h3 className="text-[18px] font-bold text-[#333]">{item.product_name}</h3>
                                    <p className="text-[14px] text-[#666] mt-[2px]">Bill: {item.bill_no || 'N/A'}</p>
                                </div>
                                <span className="text-[18px] font-bold text-[#1976d2]">₹{item.bill_amount}</span>
                            </div>

                            <p className="text-[14px] text-[#666] mb-[10px] border-b border-[#eee] pb-[10px]">
                                {item.promoter_email}
                            </p>

                            <div className="flex flex-row justify-between items-center">
                                <div>
                                    <p className="text-[12px] text-[#888] mb-[2px]">Status</p>
                                    <p className="text-[14px] font-bold uppercase" style={{ color: getStatusColor(item.status) }}>
                                        {item.status.replace('_', ' ')}
                                    </p>
                                </div>
                                <div className="text-right bg-indigo-50 px-3 py-1 rounded-full">
                                    <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-tight">Review Case</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
