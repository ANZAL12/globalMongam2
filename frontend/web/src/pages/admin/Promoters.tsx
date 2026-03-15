import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ChevronRight, Mail, Phone, CreditCard, Users, Plus } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface Promoter {
    id: string; // Supabase uses UUID string for auth.users
    email: string;
    shop_name: string;
    full_name: string;
    phone_number: string;
    gpay_number: string;
    is_active: boolean;
    created_at: string;
}

export default function AdminPromoters() {
    const navigate = useNavigate();
    const [promoters, setPromoters] = useState<Promoter[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPromoters = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'promoter')
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            setPromoters(data as Promoter[] || []);
        } catch (error: any) {
            console.error('Error fetching promoters:', error);
            alert('Failed to fetch promoters list.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPromoters();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full flex-1 bg-[#f5f5f5]">
                <div className="w-8 h-8 border-4 border-[#1976d2] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-[#f5f5f5] min-h-[calc(100vh-130px)] pb-[80px] relative">
            <div className="p-[15px]">
                <h1 className="text-[24px] font-bold mb-[20px] text-[#333]">Registered Promoters</h1>

                {promoters.length === 0 ? (
                    <div className="flex flex-col items-center mt-[100px]">
                        <Users size={64} className="text-[#ccc]" />
                        <p className="text-[18px] text-[#999] mt-[10px]">No promoters found.</p>
                    </div>
                ) : (
                    promoters.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => navigate(`/admin/promoter/${item.id}`)}
                            className="bg-white rounded-[12px] p-[15px] mb-[15px] shadow-[0_2px_4px_rgba(0,0,0,0.1)] cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                        >
                            {/* Card Header */}
                            <div className="flex flex-row items-center mb-[10px]">
                                <div className="w-[50px] h-[50px] rounded-[25px] bg-[#e3f2fd] flex justify-center items-center">
                                    <User size={32} className="text-[#1976d2]" />
                                </div>
                                <div className="flex-1 ml-[15px]">
                                    <h2 className="text-[18px] font-bold text-[#333]">{item.full_name || 'No Name Provided'}</h2>
                                    <p className="text-[14px] text-[#666] mt-[2px]">{item.shop_name || 'N/A'}</p>
                                </div>
                                <div className={`px-[8px] py-[4px] rounded-[6px] ${item.is_active ? 'bg-[#e8f5e9]' : 'bg-[#ffebee]'}`}>
                                    <span className={`text-[12px] font-bold ${item.is_active ? 'text-[#2e7d32]' : 'text-[#c62828]'}`}>
                                        {item.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <ChevronRight size={24} className="text-[#ccc] ml-[5px]" />
                            </div>

                            {/* Card Body */}
                            <div className="py-[10px]">
                                <div className="flex flex-row items-center mb-[5px]">
                                    <Mail size={18} className="text-[#666]" />
                                    <p className="ml-[10px] text-[14px] text-[#444]">{item.email}</p>
                                </div>
                                <div className="flex flex-row items-center mb-[5px]">
                                    <Phone size={18} className="text-[#666]" />
                                    <p className="ml-[10px] text-[14px] text-[#444]">{item.phone_number || 'N/A'}</p>
                                </div>
                                {item.gpay_number && (
                                    <div className="flex flex-row items-center mb-[5px]">
                                        <CreditCard size={18} className="text-[#666]" />
                                        <p className="ml-[10px] text-[14px] text-[#444]">GPay: {item.gpay_number}</p>
                                    </div>
                                )}
                            </div>

                            {/* Card Footer */}
                            <div className="mt-[10px] pt-[10px] border-t border-[#f0f0f0] flex justify-end">
                                <p className="text-[12px] text-[#999]">Joined: {new Date(item.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <button
                onClick={() => navigate('/admin/add-promoter')}
                className="fixed bottom-[90px] right-[20px] w-[56px] h-[56px] bg-[#1976d2] rounded-full flex items-center justify-center shadow-[0_4px_8px_rgba(25,118,210,0.4)] hover:bg-[#1565c0] transition-colors"
                aria-label="Add Promoter"
            >
                <Plus size={28} className="text-white" />
            </button>
        </div>
    );
}
