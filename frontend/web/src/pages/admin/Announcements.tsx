import { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, Edit2, X } from 'lucide-react';
import { supabase } from '../../services/supabase';

type Announcement = {
    id: string;
    title: string;
    description: string;
    image_url: string | null;
    target_promoters: string[];
    target_promoter_emails: string[];
    created_at: string;
};

type Promoter = {
    id: string;
    email: string;
    full_name: string;
    shop_name: string;
};

export default function AdminAnnouncements() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    // Form state (Create/Edit)
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [targetPromoters, setTargetPromoters] = useState<string[]>([]);
    const [promoters, setPromoters] = useState<Promoter[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchPromoters = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'promoter');
            if (error) throw error;
            setPromoters(data || []);
        } catch (err) {
            console.error('Failed to fetch promoters', err);
        }
    };

    const fetchAnnouncements = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('announcements')
                .select(`
                    *,
                    announcement_targets (
                        users ( id, email )
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            const formatted = (data || []).map((ann: any) => ({
                ...ann,
                target_promoters: ann.announcement_targets?.map((t: any) => t.users?.id) || [],
                target_promoter_emails: ann.announcement_targets?.map((t: any) => t.users?.email) || [],
            }));
            setAnnouncements(formatted);
        } catch (err) {
            console.error('Failed to fetch announcements', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
        fetchPromoters();
    }, []);

    const resetForm = () => {
        setTitle('');
        setContent('');
        setImageFile(null);
        setImagePreview(null);
        setTargetPromoters([]);
        setSearchQuery('');
        setEditingId(null);
        setError('');
        setIsFormVisible(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleCreateNew = () => {
        resetForm();
        setIsFormVisible(true);
    };

    const handleEdit = (announcement: Announcement) => {
        setTitle(announcement.title);
        setContent(announcement.description);
        setImagePreview(announcement.image_url ? announcement.image_url : null);
        setTargetPromoters(announcement.target_promoters || []);
        setSearchQuery('');
        setImageFile(null);
        setEditingId(announcement.id);
        setError('');
        setIsFormVisible(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this announcement?")) return;

        try {
            const { error } = await supabase
                .from('announcements')
                .delete()
                .eq('id', id);
            if (error) throw error;
            fetchAnnouncements();
        } catch (err) {
            console.error('Failed to delete', err);
            alert("Error deleting announcement.");
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            setError('Please enter a title and content.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            let uploadedImageUrl = imagePreview && imagePreview.startsWith('http') ? imagePreview : null;

            if (imageFile) {
                const formData = new FormData();
                formData.append('file', imageFile);
                formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default');
                formData.append('cloud_name', import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dy8s5kclm');

                const response = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dy8s5kclm'}/image/upload`, {
                    method: 'POST',
                    body: formData,
                });

                const uploadData = await response.json();
                if (uploadData.error) throw new Error(uploadData.error.message);
                uploadedImageUrl = uploadData.secure_url;
            }

            let announcementId = editingId;

            if (editingId) {
                const { error: updateError } = await supabase
                    .from('announcements')
                    .update({
                        title,
                        description: content,
                        image_url: uploadedImageUrl
                    })
                    .eq('id', editingId);
                
                if (updateError) throw updateError;
                
                // Update targets: simplest way is to delete old and insert new
                await supabase.from('announcement_targets').delete().eq('announcement_id', editingId);
            } else {
                const { data: newAnn, error: createError } = await supabase
                    .from('announcements')
                    .insert([{
                        title,
                        description: content,
                        image_url: uploadedImageUrl
                    }])
                    .select()
                    .single();
                
                if (createError) throw createError;
                announcementId = newAnn.id;
            }

            if (targetPromoters.length > 0 && announcementId) {
                const targetsData = targetPromoters.map(userId => ({
                    announcement_id: announcementId,
                    user_id: userId
                }));
                const { error: targetError } = await supabase
                    .from('announcement_targets')
                    .insert(targetsData);
                
                if (targetError) throw targetError;
            }

            resetForm();
            fetchAnnouncements();
        } catch (err) {
            console.error('Submit failed', err);
            setError('There was an error saving the announcement.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading && !isFormVisible && announcements.length === 0) {
        return (
            <div className="flex flex-1 justify-center items-center h-full bg-[#f5f5f5]">
                <div className="w-8 h-8 border-4 border-[#1976d2] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-[#f5f5f5] min-h-full">
            {isFormVisible ? (
                <div className="bg-white p-[20px] m-[15px] rounded-[8px] shadow-[0_2px_3px_rgba(0,0,0,0.1)]">
                    <div className="flex justify-between items-center mb-[20px] pb-[10px] border-b border-[#eee]">
                        <h2 className="text-[20px] font-bold text-[#333]">
                            {editingId ? 'Edit Announcement' : 'New Announcement'}
                        </h2>
                        <button onClick={resetForm} className="p-1 text-[#888] hover:text-[#333] transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col">
                        {error && (
                            <div className="bg-[#ffebee] text-[#c62828] p-3 rounded-[8px] text-sm mb-4 font-medium">
                                {error}
                            </div>
                        )}

                        <label className="text-[16px] font-[600] mb-[8px] text-[#333]">Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. November Sales!"
                            className="border border-[#ccc] rounded-[8px] p-[12px] text-[16px] mb-[20px] bg-[#fafafa] outline-none focus:border-[#1976d2]"
                        />

                        <label className="text-[16px] font-[600] mb-[8px] text-[#333]">Content *</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Write the full announcement here..."
                            className="border border-[#ccc] rounded-[8px] p-[12px] text-[16px] mb-[20px] bg-[#fafafa] outline-none focus:border-[#1976d2] h-[120px] resize-none"
                        />

                        <label className="text-[16px] font-[600] mb-[8px] text-[#333]">Target Promoters (Optional)</label>
                        <p className="text-[12px] text-[#666] mb-[8px]">Click multiple to select. Deselect all to notify everyone.</p>
                        <input
                            type="text"
                            placeholder="Search promoters by name, email, or shop..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="border border-[#ccc] rounded-[8px] p-[10px] text-[14px] mb-[10px] bg-[#fafafa] outline-none focus:border-[#1976d2] w-full"
                        />
                        <div className="flex overflow-x-auto pb-2 mb-4 gap-2 scrollbar-thin scrollbar-thumb-gray-300">
                            <button
                                type="button"
                                onClick={() => setTargetPromoters([])}
                                className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors border ${(!targetPromoters || targetPromoters.length === 0)
                                        ? 'bg-[#1976d2] text-white border-[#1976d2]'
                                        : 'bg-white text-[#666] border-[#ccc] hover:bg-gray-50'
                                    }`}
                            >
                                All Promoters
                            </button>
                            {promoters.filter(p => {
                                const name = p.full_name || '';
                                const email = p.email || '';
                                const shop = p.shop_name || '';
                                const query = searchQuery.toLowerCase();
                                return name.toLowerCase().includes(query) ||
                                    email.toLowerCase().includes(query) ||
                                    shop.toLowerCase().includes(query);
                            }).map((p) => {
                                const isSelected = (targetPromoters || []).includes(p.id);
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                            if (isSelected) {
                                                setTargetPromoters((prev) => prev.filter(id => id !== p.id));
                                            } else {
                                                setTargetPromoters((prev) => [...(prev || []), p.id]);
                                            }
                                        }}
                                        className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors border ${isSelected
                                                ? 'bg-[#1976d2] text-white border-[#1976d2]'
                                                : 'bg-white text-[#666] border-[#ccc] hover:bg-gray-50'
                                            }`}
                                    >
                                        {p.full_name || p.email}
                                    </button>
                                );
                            })}
                        </div>

                        <label className="text-[16px] font-[600] mb-[8px] text-[#333]">Feature Image (Optional)</label>
                        <div className="flex flex-col items-center mb-[30px]">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="w-full h-[150px] object-cover rounded-[8px] mb-[10px]" />
                            ) : (
                                <div className="w-full p-[30px] border border-[#ccc] border-dashed rounded-[8px] mb-[10px] flex items-center justify-center text-[#888]">
                                    No image selected
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-[#e0e0e0] hover:bg-[#d5d5d5] text-[#333] px-[16px] py-[8px] rounded-[4px] text-[14px] font-[500] uppercase tracking-wider transition-colors"
                            >
                                Choose Image
                            </button>
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={handleImageChange}
                                className="hidden"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full bg-[#1976d2] rounded-[4px] p-[12px] flex items-center justify-center uppercase tracking-wider font-[600] text-white transition-colors ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'
                                }`}
                        >
                            {isSubmitting ? (
                                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            ) : (
                                <span>{editingId ? 'Update Announcement' : 'Post Announcement'}</span>
                            )}
                        </button>
                    </form>
                </div>
            ) : (
                <>
                    {announcements.length === 0 ? (
                        <div className="flex justify-center p-[40px] pt-[60px]">
                            <p className="text-[16px] text-[#888] text-center">No announcements have been posted yet.</p>
                        </div>
                    ) : (
                        <div className="pt-[15px]">
                            {announcements.map((item) => (
                                <div key={item.id} className="bg-white mx-[15px] mb-[15px] p-[15px] rounded-[8px] shadow-[0_2px_3px_rgba(0,0,0,0.1)] relative">
                                    <div className="absolute top-[15px] right-[15px] flex flex-row gap-3">
                                        <button
                                            onClick={() => handleEdit(item)}
                                            className="text-[#1976d2] hover:bg-blue-50 p-2 rounded-full transition-colors"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="text-[#f44336] hover:bg-red-50 p-2 rounded-full transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>

                                    <h3 className="text-[20px] font-bold text-[#333] pr-[80px] mb-[5px]">{item.title}</h3>
                                    <p className="text-[12px] text-[#888] mb-[10px]">
                                        {new Date(item.created_at).toLocaleDateString()}
                                        {item.target_promoter_emails && item.target_promoter_emails.length > 0 && ` • Targets: ${item.target_promoter_emails.join(', ')}`}
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

                    {/* Floating Action Button for Create */}
                    <button
                        onClick={handleCreateNew}
                        className="fixed bottom-[80px] right-[20px] w-[56px] h-[56px] bg-[#1976d2] rounded-full flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.3)] hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all z-50 text-white"
                    >
                        <Plus size={30} strokeWidth={2.5} />
                    </button>
                </>
            )}
        </div>
    );
}
