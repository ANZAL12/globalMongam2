import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, User, Mail, Phone, CreditCard, Calendar, History, ShieldAlert, ShieldCheck } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { logAdminAction, ActionFlag } from '../../services/logger';

interface Sale {
    id: string; // UUID from supabase
    product_name: string;
    bill_amount: string;
    status: string;
    incentive_amount: string;
    payment_status: string;
    created_at: string;
    paid_at?: string | null;
}

interface PromoterDetail {
    id: string; // UUID from supabase
    email: string;
    shop_name: string;
    full_name: string;
    phone_number: string;
    gpay_number: string;
    is_active: boolean;
    created_at: string;
    sales_history: Sale[];
}

export default function AdminPromoterDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [promoter, setPromoter] = useState<PromoterDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [isStatusLoading, setIsStatusLoading] = useState(false);

    const fetchPromoterDetail = async () => {
        try {
            // Fetch promoter details
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .single();

            if (userError) throw userError;

            // Fetch sales history
            const { data: salesData, error: salesError } = await supabase
                .from('sales')
                .select('*')
                .eq('promoter_id', id)
                .order('created_at', { ascending: false });

            if (salesError) throw salesError;

            setPromoter({
                ...userData,
                sales_history: salesData || []
            });
        } catch (error: any) {
            console.error('Error fetching promoter detail:', error);
            alert('Failed to load promoter details.');
        } finally {
            setLoading(false);
        }
    };

    const toggleActiveStatus = async () => {
        if (!promoter) return;
        const newStatus = !promoter.is_active;
        const actionText = newStatus ? 'enable' : 'disable';

        if (!window.confirm(`Are you sure you want to ${actionText} this promoter?`)) return;

        setIsStatusLoading(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({ is_active: newStatus })
                .eq('id', id);

            if (error) throw error;

            // Log the action
            await logAdminAction(
                ActionFlag.CHANGE,
                `Promoter: ${promoter.full_name}`,
                `${newStatus ? 'Enabled' : 'Disabled'} promoter account (${promoter.email})`
            );

            alert(`Promoter has been ${newStatus ? 'enabled' : 'disabled'}.`);
            fetchPromoterDetail();
        } catch (error: any) {
            console.error('Error toggling status:', error);
            alert(`Failed to ${actionText} promoter.`);
        } finally {
            setIsStatusLoading(false);
        }
    };

    useEffect(() => {
        fetchPromoterDetail();
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-1 justify-center items-center h-full bg-[#f5f5f5]">
                <div className="w-8 h-8 border-4 border-[#1976d2] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!promoter) {
        return (
            <div className="flex flex-1 justify-center items-center h-full bg-[#f5f5f5]">
                <p className="text-[18px] text-[#d32f2f]">Promoter not found.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-[#f5f5f5] min-h-full">
            {/* Custom Header for detail view */}
            <div className="bg-[#1976d2] pt-[20px] pb-[20px] px-[20px] flex items-center shadow-md">
                <button
                    onClick={() => navigate(-1)}
                    className="mr-[15px] text-white hover:bg-white/10 rounded-full p-1 transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-[20px] font-bold text-white tracking-wide">Promoter Profile</h1>
            </div>

            <div className="p-[20px]">
                {/* Profile Section equivalent to ListHeaderComponent in React Native */}
                <div className="bg-white rounded-[15px] p-[20px] flex flex-col items-center shadow-[0_2px_5px_rgba(0,0,0,0.1)] mb-[30px]">
                    <div className="w-[80px] h-[80px] rounded-[40px] bg-[#e3f2fd] flex justify-center items-center mb-[15px]">
                        <User size={40} className="text-[#1976d2]" />
                    </div>

                    <h2 className="text-[22px] font-bold text-[#333]">{promoter.full_name || 'No Name Provided'}</h2>
                    <p className="text-[16px] text-[#666] mb-[20px]">{promoter.shop_name || 'N/A'}</p>

                    <div className="w-full border-t border-[#f0f0f0] pt-[20px]">
                        <div className="flex flex-row items-center mb-[12px]">
                            <Mail size={20} className="text-[#666]" />
                            <p className="ml-[12px] text-[15px] text-[#444]">{promoter.email}</p>
                        </div>
                        <div className="flex flex-row items-center mb-[12px]">
                            <Phone size={20} className="text-[#666]" />
                            <p className="ml-[12px] text-[15px] text-[#444]">{promoter.phone_number || 'N/A'}</p>
                        </div>
                        <div className="flex flex-row items-center mb-[12px]">
                            <CreditCard size={20} className="text-[#666]" />
                            <p className="ml-[12px] text-[15px] text-[#444]">GPay: {promoter.gpay_number || 'N/A'}</p>
                        </div>
                        <div className="flex flex-row items-center mb-[12px]">
                            <Calendar size={20} className="text-[#666]" />
                            <p className="ml-[12px] text-[15px] text-[#444]">Joined: {new Date(promoter.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex flex-row items-center mb-[12px]">
                            {promoter.is_active ? (
                                <ShieldCheck size={20} className="text-green-600" />
                            ) : (
                                <ShieldAlert size={20} className="text-red-600" />
                            )}
                            <p className={`ml-[12px] text-[15px] font-bold ${promoter.is_active ? 'text-green-600' : 'text-red-600'}`}>
                                {promoter.is_active ? 'Account Active' : 'Account Disabled'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={toggleActiveStatus}
                        disabled={isStatusLoading}
                        className={`mt-[10px] w-full py-[12px] rounded-[10px] font-bold text-white transition-all shadow-sm ${promoter.is_active
                                ? 'bg-red-500 hover:bg-red-600 active:bg-red-700'
                                : 'bg-green-500 hover:bg-green-600 active:bg-green-700'
                            } ${isStatusLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isStatusLoading ? 'Processing...' : promoter.is_active ? 'Disable Promoter' : 'Enable Promoter'}
                    </button>
                </div>

                <h3 className="text-[18px] font-bold text-[#333] mb-[15px]">Incentives & Rewards History</h3>

                {promoter.sales_history.length === 0 ? (
                    <div className="flex flex-col items-center mt-[50px] px-[40px]">
                        <History size={48} className="text-[#ccc]" />
                        <p className="text-[16px] text-[#999] mt-[10px] text-center">No incentives recorded yet.</p>
                    </div>
                ) : (
                    promoter.sales_history.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => navigate(`/admin/sale/${item.id}`)}
                            className="bg-white rounded-[12px] p-[15px] mb-[15px] shadow-[0_2px_4px_rgba(0,0,0,0.1)] cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex flex-row justify-between items-center mb-[10px] border-b border-[#f0f0f0] pb-[10px]">
                                <p className="text-[16px] font-bold text-[#333]">{item.product_name}</p>
                                <div className="flex flex-row items-center">
                                    <div className={`px-[8px] py-[4px] rounded-[5px] ${item.status === 'approved' ? 'bg-[#e8f5e9]' : item.status === 'rejected' ? 'bg-[#ffebee]' : 'bg-[#fff3e0]'}`}>
                                        <p className="text-[10px] font-bold text-[#555] uppercase">{item.status}</p>
                                    </div>
                                    <ChevronRight size={20} className="text-[#ccc] ml-[5px]" />
                                </div>
                            </div>

                            <div className="mb-[10px]">
                                <div className="flex flex-row justify-between mb-[5px]">
                                    <p className="text-[14px] text-[#777]">Bill Amount:</p>
                                    <p className="text-[14px] font-[500] text-[#333]">₹{item.bill_amount}</p>
                                </div>
                                <div className="flex flex-row justify-between mb-[5px]">
                                    <p className="text-[14px] text-[#777]">Incentive Rewarded:</p>
                                    <p className="text-[14px] font-bold text-[#2e7d32]">₹{item.incentive_amount || '0.00'}</p>
                                </div>
                                <div className="flex flex-row justify-between mb-[5px]">
                                    <p className="text-[14px] text-[#777]">Payment Status:</p>
                                    <div className="flex flex-col items-end">
                                        <p className={`text-[14px] font-[500] uppercase ${item.payment_status === 'paid' ? 'text-[#2e7d32]' : 'text-[#d32f2f]'}`}>
                                            {item.payment_status}
                                        </p>
                                        {item.payment_status === 'paid' && item.paid_at && (
                                            <p className="text-[11px] text-[#999] mt-[2px]">
                                                {new Date(item.paid_at).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <p className="text-[11px] text-[#999] text-right">
                                {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
