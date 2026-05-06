import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { Trash2 } from 'lucide-react';

type Sale = {
    id: string; // UUID
    product_name: string;
    model_no: string | null;
    serial_no: string | null;
    bill_no: string | null;
    bill_amount: string;
    status: string;
    incentive_amount: string | null;
    payment_status: string;
    created_at: string;
    transaction_id?: string | null;
    paid_by_email?: string | null;
    approved_by_email?: string | null;
};

export default function PromoterSales() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSales = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('sales')
                .select('id, product_name, model_no, serial_no, bill_no, bill_amount, status, incentive_amount, payment_status, created_at, transaction_id, approved_by_email, paid_by_email')
                .eq('promoter_id', user.id)
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            setSales(data || []);
        } catch (error) {
            console.error('Failed to fetch my sales', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSales();
    }, []);

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this sale?")) return;

        try {
            const { error } = await supabase.from('sales').delete().eq('id', id);
            if (error) throw error;
            fetchSales();
        } catch (error) {
            console.error('Failed to delete sale:', error);
            alert('Failed to delete sale');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
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
        <div className="flex-1 bg-[#f5f5f5] min-h-full">
            {sales.length === 0 ? (
                <div className="flex justify-center p-[40px] pt-[60px]">
                    <p className="text-[16px] text-[#888] text-center">You haven't uploaded any sales yet.</p>
                </div>
            ) : (
                <div className="pt-[15px]">
                    {sales.map((item) => (
                        <div key={item.id} className="bg-white mx-[15px] mb-[15px] p-[15px] rounded-[8px] shadow-[0_2px_3px_rgba(0,0,0,0.1)]">
                            <div className="flex flex-row justify-between border-b border-[#eee] pb-[10px] mb-[10px]">
                                <div>
                                    <h3 className="text-[18px] font-bold text-[#333]">{item.product_name}</h3>
                                    {item.model_no && <p className="text-[14px] text-[#666] mt-[2px]">Model: {item.model_no}</p>}
                                    {item.bill_no && <p className="text-[14px] text-[#666] mt-[2px]">Bill: {item.bill_no}</p>}
                                </div>
                                <div className="flex flex-col items-end">
                                    <p className="text-[18px] font-bold text-[#1976d2]">₹{item.bill_amount}</p>
                                    {(item.status === 'pending' || item.status === 'rejected') && (
                                        <button 
                                            onClick={() => handleDelete(item.id)}
                                            className="mt-2 p-1.5 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors"
                                            title="Delete Sale"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-row justify-between mb-[10px]">
                                <div>
                                    <p className="text-[12px] text-[#666] mb-[2px]">Status</p>
                                    <p className="text-[14px] font-bold uppercase transition-colors" style={{ color: getStatusColor(item.status) }}>
                                        {item.status}
                                    </p>
                                    {item.approved_by_email && (
                                        <p className="text-[10px] text-[#1976d2] mt-[2px] italic">
                                            By: {item.approved_by_email}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="text-[12px] text-[#666] mb-[2px]">Incentive</p>
                                    <p className="text-[14px] font-[600] text-[#333]">
                                        {item.incentive_amount ? `₹${item.incentive_amount}` : "Pending"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-row justify-between pt-[8px] border-t border-[#eee]">
                                <p className="text-[12px] text-[#888]">
                                    {new Date(item.created_at).toLocaleDateString()}
                                </p>
                                <div className="text-right">
                                    <p className="text-[12px] text-[#555]">
                                        Payment: <span className="font-bold capitalize">{item.payment_status}</span>
                                    </p>
                                    {item.paid_by_email && (
                                        <p className="text-[10px] text-[#1976d2] mt-[2px] italic">
                                            By: {item.paid_by_email}
                                        </p>
                                    )}
                                    {item.transaction_id && (
                                        <p className="text-[11px] text-[#1976d2] font-bold mt-[2px]">
                                            Txn ID: {item.transaction_id}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
