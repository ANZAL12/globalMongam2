import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';
import { supabase } from '../../services/supabase';

type Announcement = {
    id: string;
    title: string;
    description: string;
    image_url: string | null;
    created_at: string;
};

export default function ApproverAnnouncementDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [announcement, setAnnouncement] = useState<Announcement | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnnouncement = async () => {
            if (!id) return;

            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data, error } = await supabase
                    .from('announcements')
                    .select(`
                        *,
                        announcement_targets!inner (
                            user_id
                        )
                    `)
                    .eq('id', id)
                    .eq('announcement_targets.user_id', user.id)
                    .single();

                if (error) throw error;
                setAnnouncement(data);
            } catch (error) {
                console.error('Failed to fetch approver announcement details', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnnouncement();
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-1 justify-center items-center h-full bg-[#f5f5f5]">
                <div className="w-8 h-8 border-4 border-[#1976d2] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!announcement) {
        return (
            <div className="flex flex-1 justify-center items-center h-full bg-[#f5f5f5] p-5">
                <p className="text-[16px] text-[#666]">Announcement not found.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-[#f5f5f5] min-h-full">
            <div className="bg-white m-[15px] p-[20px] rounded-[16px] shadow-[0_5px_10px_rgba(0,0,0,0.1)]">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="mb-[15px] inline-flex items-center gap-2 text-[#333] font-bold"
                >
                    <ArrowLeft size={20} />
                    Back
                </button>

                <h1 className="text-[24px] font-bold text-[#333] mb-[8px]">{announcement.title}</h1>
                <div className="flex items-center gap-2 mb-[20px] text-[#888]">
                    <Calendar size={14} />
                    <span className="text-[14px]">
                        {new Date(announcement.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </span>
                </div>

                {announcement.image_url && (
                    <img
                        src={announcement.image_url}
                        alt="Announcement"
                        className="w-full h-[300px] object-contain rounded-[12px] mb-[20px] bg-[#f0f0f0]"
                    />
                )}

                <div className="h-px bg-[#eee] mb-[20px]" />
                <p className="text-[16px] text-[#444] leading-[26px] whitespace-pre-wrap">{announcement.description}</p>
            </div>
        </div>
    );
}
