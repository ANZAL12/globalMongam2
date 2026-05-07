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
    has_duplicate_serial?: boolean;
};

export default function ApproverSales() {
    const navigate = useNavigate();
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);

    const normalizeSerial = (serial: string | null | undefined) => serial?.trim().toLowerCase() || '';

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
                .select(`
                    *,
                    promoter:users!promoter_id(email)
                `)
                .in('promoter_id', promoterIds)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const { data: allSerials, error: allSerialsError } = await supabase
                .from('sales')
                .select('serial_no');

            if (allSerialsError) throw allSerialsError;

            const serialCounts = new Map<string, number>();
            for (const sale of allSerials || []) {
                const serialKey = normalizeSerial(sale.serial_no);
                if (!serialKey) continue;
                serialCounts.set(serialKey, (serialCounts.get(serialKey) || 0) + 1);
            }

            const formattedSales = (data || []).map((sale: any) => ({
                ...sale,
                promoter_email: sale.promoter?.email || 'Unknown',
                has_duplicate_serial: (() => {
                    const serialKey = normalizeSerial(sale.serial_no);
                    return serialKey ? (serialCounts.get(serialKey) || 0) > 1 : false;
                })(),
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
            case 'approved':
            case 'paid': return '#4caf50';
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
                                    {item.model_no && <p className="text-[14px] text-[#666] mt-[2px]">Model: {item.model_no}</p>}
                                    {item.serial_no && <p className="text-[14px] text-[#666] mt-[2px]">Serial: {item.serial_no}</p>}
                                    {item.has_duplicate_serial && (
                                        <p className="text-[12px] text-[#c62828] mt-[4px] font-[600]">
                                            Duplicate serial found in uploaded sales
                                        </p>
                                    )}
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
                                <div className="text-right">
                                    <p className="text-[12px] text-[#888] mb-[2px]">Date</p>
                                    <p className="text-[14px] font-[600] text-[#555]">
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
