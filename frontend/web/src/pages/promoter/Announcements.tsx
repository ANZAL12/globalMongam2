import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';

type Announcement = {
    id: string; // UUID
    title: string;
    description: string;
    image_url: string | null;
    created_at: string;
};

export default function PromoterAnnouncements() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAnnouncements = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch announcements. This is tricky due to target relationships.
            // Ideal logic: If there are targets for an announcement, check if the current user is in them.
            // Since RLS should handle this, or we fallback to fetching all and filtering, or querying properly.
            // A simple approach is to query announcements and its targets. RLS is better, but for now we'll do:
            const { data, error } = await supabase
                .from('announcements')
                .select(`
                    *,
                    announcement_targets!left (
                        user_id
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Filter out announcements that have targets but don't include the current user
            const validAnnouncements = (data || []).filter((ann: any) => {
                const targets = ann.announcement_targets || [];
                if (targets.length === 0) return true; // Targeted to all
                return targets.some((t: any) => t.user_id === user.id);
            });

            setAnnouncements(validAnnouncements);
        } catch (error) {
            console.error('Failed to fetch announcements', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-1 justify-center items-center h-full bg-[#f5f5f5]">
                <div className="w-8 h-8 border-4 border-[#1976d2] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-[#f5f5f5] min-h-[calc(100vh-130px)] pb-[80px]">
            {announcements.length === 0 ? (
                <div className="flex justify-center p-[40px] pt-[60px]">
                    <p className="text-[16px] text-[#888] text-center">No announcements available.</p>
                </div>
            ) : (
                <div className="pt-[15px]">
                    {announcements.map((item) => (
                        <div key={item.id} className="bg-white mx-[15px] mb-[15px] p-[15px] rounded-[8px] shadow-[0_2px_3px_rgba(0,0,0,0.1)]">
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

                            <p className="text-[16px] text-[#555] leading-[24px]">
                                {item.description}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
