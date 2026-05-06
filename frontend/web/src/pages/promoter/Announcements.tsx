import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';

type Announcement = {
    id: string; // UUID
    title: string;
    description: string;
    image_url: string | null;
    created_at: string;
};

export default function PromoterAnnouncements() {
    const navigate = useNavigate();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [isBlocked, setIsBlocked] = useState(false);

    const fetchAnnouncements = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: userData } = await supabase
                .from('users')
                .select('is_active')
                .eq('id', user.id)
                .single();

            if (userData && userData.is_active === false) {
                setIsBlocked(true);
                setAnnouncements([]);
                return;
            }

            setIsBlocked(false);

            const { data, error } = await supabase
                .from('announcements')
                .select(`
                    *,
                    announcement_targets!inner (
                        user_id
                    )
                `)
                .eq('announcement_targets.user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAnnouncements(data || []);
        } catch (error) {
            console.error('Failed to fetch announcements', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const channel = supabase
            .channel('realtime_announcements')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'announcement_targets' },
                (payload) => {
                    supabase.auth.getUser().then(({ data: { user } }) => {
                        if (user && payload.new.user_id === user.id) fetchAnnouncements();
                    });
                }
            )
            .subscribe();

        fetchAnnouncements();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    if (loading) {
        return (
            <div className="flex flex-1 justify-center items-center h-full bg-[#f5f5f5]">
                <div className="w-8 h-8 border-4 border-[#1976d2] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (isBlocked) {
        return (
            <div className="flex flex-1 flex-col justify-center items-center h-full bg-[#f5f5f5] p-5 text-center">
                <div className="text-[48px] text-[#d32f2f] mb-4">!</div>
                <h2 className="text-[20px] font-bold text-[#d32f2f] mb-2">Access Blocked</h2>
                <p className="text-[16px] text-[#555]">
                    Your account has been blocked. You can no longer view announcements. Please contact the administrator for more information.
                </p>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-[#f5f5f5] min-h-full">
            {announcements.length === 0 ? (
                <div className="flex justify-center p-[40px] pt-[60px]">
                    <p className="text-[16px] text-[#888] text-center">No announcements available.</p>
                </div>
            ) : (
                <div className="pt-[15px]">
                    {announcements.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => navigate(`/promoter/details/${item.id}`)}
                            className="block w-[calc(100%-30px)] text-left bg-white mx-[15px] mb-[15px] p-[15px] rounded-[8px] shadow-[0_2px_3px_rgba(0,0,0,0.1)]"
                        >
                            <h3 className="text-[20px] font-bold text-[#333] mb-[5px]">{item.title}</h3>
                            <p className="text-[12px] text-[#888] mb-[10px]">
                                {new Date(item.created_at).toLocaleDateString()}
                            </p>

                            {item.image_url && (
                                <img
                                    src={item.image_url}
                                    alt="Announcement"
                                    className="w-full h-[150px] object-cover rounded-[8px] mb-[10px]"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                            )}

                            <p className="text-[16px] text-[#555] leading-[24px] line-clamp-3">
                                {item.description}
                            </p>
                            <div className="mt-[10px] flex justify-end text-[#1976d2] text-[14px] font-bold">
                                Read more
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
