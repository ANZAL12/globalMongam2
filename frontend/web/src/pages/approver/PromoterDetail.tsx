import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Mail, Phone, ReceiptText, Wallet } from 'lucide-react';
import { supabase } from '../../services/supabase';

type Promoter = {
    id: string;
    full_name: string;
    shop_name: string | null;
    phone_number: string | null;
    email: string;
    is_active: boolean;
    upi_id: string | null;
    gpay_number: string | null;
};

type Sale = {
    id: string;
    product_name: string;
    bill_amount: string;
    status: string;
    created_at: string;
};

export default function ApproverPromoterDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [promoter, setPromoter] = useState<Promoter | null>(null);
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPromoterData = async () => {
        try {
            const { data: promoterData, error: promoterError } = await supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .single();

            if (promoterError) throw promoterError;
            setPromoter(promoterData);

            const { data: salesData, error: salesError } = await supabase
                .from('sales')
                .select('id, product_name, bill_amount, status, created_at')
                .eq('promoter_id', id)
                .order('created_at', { ascending: false });

            if (salesError) throw salesError;
            setSales(salesData || []);
        } catch (error) {
            console.error('Error fetching promoter data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchPromoterData();
    }, [id]);

    const getStatusClasses = (status: string) => {
        switch (status) {
            case 'approved':
                return 'bg-[#e8f5e9] text-[#2e7d32]';
            case 'paid':
                return 'bg-[#e3f2fd] text-[#1565c0]';
            case 'rejected':
                return 'bg-[#ffebee] text-[#c62828]';
            default:
                return 'bg-[#fff3e0] text-[#ef6c00]';
        }
    };

    if (loading) {
        return (
            <div className="flex flex-1 justify-center items-center h-full bg-[#f8fafc]">
                <div className="w-8 h-8 border-4 border-[#1976d2] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!promoter) {
        return (
            <div className="flex flex-1 justify-center items-center h-full bg-[#f8fafc]">
                <p className="text-[16px] text-[#64748b]">Promoter not found.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-[#f8fafc] min-h-full">
            <div className="bg-white border-b border-[#f1f5f9] px-[16px] py-[12px] flex items-center">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="p-2 mr-[8px] rounded-full hover:bg-[#f1f5f9] transition-colors"
                >
                    <ChevronLeft size={24} className="text-[#0f172a]" />
                </button>
                <h1 className="text-[18px] font-bold text-[#0f172a]">Promoter Details</h1>
            </div>

            <div className="p-[16px] pb-[100px]">
                <div className="bg-white rounded-[24px] p-[24px] items-center border border-[#f1f5f9] shadow-[0_4px_12px_rgba(0,0,0,0.05)] flex flex-col">
                    <div className="w-[80px] h-[80px] rounded-full bg-[#eff6ff] flex items-center justify-center mb-[16px]">
                        <span className="text-[32px] font-bold text-[#2563eb]">
                            {(promoter.full_name || promoter.email || '?').charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <h2 className="text-[22px] font-bold text-[#0f172a] text-center">{promoter.full_name || 'No name'}</h2>
                    <p className="text-[16px] text-[#64748b] mt-[4px] text-center">{promoter.shop_name || 'No shop name'}</p>

                    <div className="w-full mt-[24px] flex flex-col gap-[12px]">
                        <InfoRow icon={<Mail size={16} className="text-[#64748b]" />} text={promoter.email} />
                        <InfoRow icon={<Phone size={16} className="text-[#64748b]" />} text={promoter.phone_number || 'N/A'} />
                        <InfoRow icon={<Wallet size={16} className="text-[#64748b]" />} text={`UPI: ${promoter.upi_id || 'N/A'}`} />
                    </div>

                    {promoter.phone_number && (
                        <a
                            href={`tel:${promoter.phone_number}`}
                            className="mt-[24px] w-full bg-[#22c55e] rounded-[12px] py-[14px] flex items-center justify-center text-white font-bold text-[16px]"
                        >
                            <Phone size={20} />
                            <span className="ml-[8px]">Call Promoter</span>
                        </a>
                    )}
                </div>

                <h3 className="text-[18px] font-bold text-[#0f172a] mt-[32px] mb-[16px]">Recent Sales</h3>

                {sales.length === 0 ? (
                    <div className="flex flex-col items-center justify-center mt-[40px]">
                        <ReceiptText size={48} className="text-[#cbd5e1]" />
                        <p className="mt-[12px] text-[14px] text-[#94a3b8] text-center">
                            No sales recorded for this promoter.
                        </p>
                    </div>
                ) : (
                    sales.map((sale) => (
                        <div
                            key={sale.id}
                            onClick={() => navigate(`/approver/sale/${sale.id}`)}
                            className="bg-white rounded-[16px] p-[16px] mb-[12px] border border-[#f1f5f9] cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors flex flex-row items-center justify-between"
                        >
                            <div className="min-w-0 flex-1">
                                <h4 className="text-[16px] font-[600] text-[#1e293b] truncate">{sale.product_name}</h4>
                                <p className="text-[12px] text-[#94a3b8] mt-[2px]">
                                    {new Date(sale.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="flex flex-col items-end ml-[12px]">
                                <p className="text-[16px] font-bold text-[#0f172a]">Rs. {sale.bill_amount}</p>
                                <span className={`text-[10px] font-bold mt-[4px] px-[8px] py-[4px] rounded-[6px] ${getStatusClasses(sale.status)}`}>
                                    {sale.status.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div className="flex flex-row items-center gap-[10px] min-w-0">
            {icon}
            <span className="text-[14px] text-[#475569] truncate">{text}</span>
        </div>
    );
}
