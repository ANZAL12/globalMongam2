import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, Users } from 'lucide-react';
import { supabase } from '../../services/supabase';

type Promoter = {
    id: string;
    full_name: string;
    shop_name: string | null;
    phone_number: string | null;
    email: string;
    is_active: boolean;
};

export default function MyPromoters() {
    const navigate = useNavigate();
    const [promoters, setPromoters] = useState<Promoter[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPromoters = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('users')
                .select('id, full_name, shop_name, phone_number, email, is_active')
                .eq('approver_id', user.id)
                .eq('role', 'promoter')
                .order('full_name', { ascending: true });

            if (error) throw error;
            setPromoters(data || []);
        } catch (error) {
            console.error('Failed to fetch promoters', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPromoters();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-1 justify-center items-center h-full bg-[#f8fafc]">
                <div className="w-8 h-8 border-4 border-[#1976d2] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex-1 bg-[#f8fafc] min-h-full">
            <div className="p-[20px] bg-white border-b border-[#f1f5f9]">
                <h1 className="text-[24px] font-bold text-[#0f172a]">My Promoters</h1>
                <p className="text-[14px] text-[#64748b] mt-[4px]">List of promoters assigned to you.</p>
            </div>

            {promoters.length === 0 ? (
                <div className="flex flex-col items-center justify-center mt-[60px] px-[40px]">
                    <Users size={64} className="text-[#cbd5e1]" />
                    <p className="mt-[16px] text-[16px] text-[#94a3b8] text-center">
                        No promoters found under your account.
                    </p>
                </div>
            ) : (
                <div className="p-[16px] pb-[100px]">
                    {promoters.map((promoter) => (
                        <div
                            key={promoter.id}
                            onClick={() => navigate(`/approver/promoter/${promoter.id}`)}
                            className="bg-white rounded-[16px] p-[16px] mb-[16px] border border-[#f1f5f9] shadow-[0_2px_8px_rgba(0,0,0,0.05)] cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                        >
                            <div className="flex flex-row items-center">
                                <div className="w-[48px] h-[48px] rounded-full bg-[#eff6ff] flex items-center justify-center shrink-0">
                                    <span className="text-[20px] font-bold text-[#2563eb]">
                                        {(promoter.full_name || promoter.email || '?').charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex-1 ml-[12px] min-w-0">
                                    <h2 className="text-[16px] font-bold text-[#1e293b] truncate">
                                        {promoter.full_name || 'No name'}
                                    </h2>
                                    <p className="text-[13px] text-[#64748b] mt-[2px] truncate">
                                        {promoter.shop_name || 'No shop name'}
                                    </p>
                                </div>
                                <div className={`px-[8px] py-[4px] rounded-[8px] ${promoter.is_active ? 'bg-[#e8f5e9]' : 'bg-[#ffebee]'}`}>
                                    <span className={`text-[10px] font-bold ${promoter.is_active ? 'text-[#2e7d32]' : 'text-[#c62828]'}`}>
                                        {promoter.is_active ? 'ACTIVE' : 'INACTIVE'}
                                    </span>
                                </div>
                            </div>

                            <div className="h-px bg-[#f1f5f9] my-[12px]" />

                            <div className="flex flex-row items-center justify-between gap-3">
                                <div className="flex flex-row items-center min-w-0 flex-1">
                                    <Mail size={16} className="text-[#64748b] shrink-0" />
                                    <span className="text-[13px] text-[#64748b] ml-[6px] truncate">{promoter.email}</span>
                                </div>
                                {promoter.phone_number && (
                                    <a
                                        href={`tel:${promoter.phone_number}`}
                                        onClick={(event) => event.stopPropagation()}
                                        className="flex flex-row items-center bg-[#22c55e] px-[12px] py-[6px] rounded-[8px] text-white"
                                    >
                                        <Phone size={18} />
                                        <span className="text-[12px] font-bold ml-[4px]">Call</span>
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
