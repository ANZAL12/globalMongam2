import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Announcement } from '../../types';
import { logActivity } from '../../utils/logger';
import { useModal } from '../../context/ModalContext';
import {
  Megaphone,
  Plus,
  Search,
  Trash2,
  Edit3,
  Calendar,
  Users,
  Image as ImageIcon,
  X,
  Send,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

type TargetRole = 'promoter' | 'approver';

type TargetUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: TargetRole;
};

type AnnouncementTarget = {
  user_id: string;
  users: TargetUser | null;
};

type AnnouncementWithTargets = Announcement & {
  announcement_targets?: AnnouncementTarget[];
};

type AnnouncementPageProps = {
  targetRole: TargetRole;
};

const audienceCopy = {
  promoter: {
    title: 'Promoter Announcements',
    description: 'Send updates, news, and notifications to your promoters.',
    button: 'Create Promoter Announcement',
    empty: 'Create your first announcement to reach your promoters.',
    defaultTarget: 'Default: All Promoters',
    filterPlaceholder: 'Filter targeted promoters...',
    distribution: 'Promoter Distribution',
    logLabel: 'Promoter Announcement',
    icon: Megaphone,
  },
  approver: {
    title: 'Approver Announcements',
    description: 'Send updates, news, and notifications to your approvers.',
    button: 'Create Approver Announcement',
    empty: 'Create your first announcement to reach your approvers.',
    defaultTarget: 'Default: All Approvers',
    filterPlaceholder: 'Filter targeted approvers...',
    distribution: 'Approver Distribution',
    logLabel: 'Approver Announcement',
    icon: ShieldCheck,
  },
};

export function Announcements({ targetRole }: AnnouncementPageProps) {
  const copy = audienceCopy[targetRole];
  const AudienceIcon = copy.icon;
  const [announcements, setAnnouncements] = useState<AnnouncementWithTargets[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showAlert, showConfirm } = useModal();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [targetUsers, setTargetUsers] = useState<TargetUser[]>([]);
  const [targetSearch, setTargetSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
    fetchTargetUsers();
  }, [targetRole]);

  async function fetchAnnouncements() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          announcement_targets (
            user_id,
            users (
              id,
              email,
              full_name,
              role
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const audienceAnnouncements = ((data || []) as AnnouncementWithTargets[]).filter((ann) =>
        ann.announcement_targets?.some((target) => target.users?.role === targetRole)
      );
      setAnnouncements(audienceAnnouncements);
    } catch (err) {
      console.error(`Error fetching ${targetRole} announcements:`, err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTargetUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role')
        .eq('role', targetRole)
        .order('email', { ascending: true });

      if (error) throw error;
      setTargetUsers((data || []) as TargetUser[]);
    } catch (err) {
      console.error(`Error fetching ${targetRole}s:`, err);
    }
  }

  const handleEdit = (ann: AnnouncementWithTargets) => {
    setEditingId(ann.id);
    setTitle(ann.title);
    setDescription(ann.description);
    setImageUrl(ann.image_url || '');
    setImagePreview(ann.image_url || null);
    setImageFile(null);
    setSelectedUsers(
      ann.announcement_targets
        ?.filter((target) => target.users?.role === targetRole)
        .map((target) => target.user_id) || []
    );
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default');
    formData.append('cloud_name', import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dy8s5kclm');

    const response = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dy8s5kclm'}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    return data.secure_url;
  };

  const sendWebPushNotifications = async (announcementId: string, targetIds: string[]) => {
    if (targetIds.length === 0) return;

    const { error } = await supabase.functions.invoke('send-web-announcement-push', {
      body: {
        announcementId,
        targetIds,
      },
    });

    if (error) {
      console.warn('Browser push notification function was not completed:', error.message);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: `Delete ${copy.logLabel}?`,
      message: 'Are you sure you want to delete this announcement? This action cannot be undone.',
      severity: 'error'
    });
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      await logActivity(`Delete ${copy.logLabel}`, `Deleted ${targetRole} announcement: "${announcements.find(a => a.id === id)?.title}"`);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      showAlert({
        title: 'Announcement Deleted',
        message: 'The announcement has been permanently removed.',
        severity: 'success'
      });
    } catch (err) {
      console.error('Delete failed:', err);
      showAlert({
        title: 'Delete Failed',
        message: 'There was an error deleting the announcement.',
        severity: 'error'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    setSubmitting(true);
    try {
      let finalImageUrl = imageUrl;

      if (imageFile) {
        finalImageUrl = await uploadImage(imageFile);
      }

      const payload = {
        title,
        description,
        image_url: finalImageUrl || null,
      };

      let announcementId = editingId;

      if (editingId) {
        const { error } = await supabase
          .from('announcements')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
        await logActivity(`Update ${copy.logLabel}`, `Updated ${targetRole} announcement: "${title}"`);
      } else {
        const { data, error } = await supabase
          .from('announcements')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        announcementId = data.id;
        await logActivity(`Create ${copy.logLabel}`, `Posted new ${targetRole} announcement: "${title}"`);
      }

      const targetIds = Array.from(new Set(
        selectedUsers.length > 0
          ? selectedUsers
          : targetUsers.map(user => user.id)
      ));

      if (announcementId && targetUsers.length > 0) {
        const currentAudienceIds = targetUsers.map(user => user.id);
        await supabase
          .from('announcement_targets')
          .delete()
          .eq('announcement_id', announcementId)
          .in('user_id', currentAudienceIds);
      }

      if (announcementId && targetIds.length > 0) {
        const targets = targetIds.map(userId => ({
          announcement_id: announcementId,
          user_id: userId
        }));

        const { error } = await supabase.from('announcement_targets').insert(targets);
        if (error) throw error;

        sendWebPushNotifications(announcementId, targetIds).catch((error) => {
          console.warn('Browser push notification request failed:', error);
        });
      }

      setIsModalOpen(false);
      resetForm();
      fetchAnnouncements();

      showAlert({
        title: editingId ? 'Announcement Updated' : 'Announcement Posted',
        message: editingId ? 'The announcement has been updated successfully.' : 'Your new announcement is now live.',
        severity: 'success'
      });
    } catch (err) {
      console.error('Submit failed:', err);
      showAlert({
        title: 'Action Failed',
        message: 'Failed to save the announcement. Please try again.',
        severity: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setImageUrl('');
    setImageFile(null);
    setImagePreview(null);
    setSelectedUsers([]);
    setTargetSearch('');
    setIsModalOpen(false);
  };

  const filteredAnnouncements = announcements.filter(a =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTargetUsers = useMemo(
    () => targetUsers.filter(user =>
      user.email.toLowerCase().includes(targetSearch.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(targetSearch.toLowerCase())
    ),
    [targetSearch, targetUsers]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{copy.title}</h1>
          <p className="mt-1 text-sm text-gray-500">{copy.description}</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
        >
          <Plus className="h-5 w-5 mr-2" />
          {copy.button}
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search announcements..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-gray-100 shadow-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredAnnouncements.map((ann) => (
            <div key={ann.id} className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col group">
              {ann.image_url && (
                <div className="h-48 overflow-hidden relative">
                  <img src={ann.image_url} alt={ann.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(ann.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleEdit(ann)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      aria-label="Edit announcement"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(ann.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      aria-label="Delete announcement"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">{ann.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-3 mb-6 flex-1 leading-relaxed">{ann.description}</p>
                <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <span className="flex items-center">
                    <Users className="h-3.5 w-3.5 mr-1.5" />
                    {copy.distribution}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {filteredAnnouncements.length === 0 && (
            <div className="col-span-full py-32 text-center text-gray-400">
              <AudienceIcon className="h-16 w-16 mx-auto mb-4 opacity-10" />
              <p className="text-lg font-medium">No announcements found.</p>
              <p className="text-sm opacity-60">{copy.empty}</p>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-500">
            <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
              <div className="flex items-center space-x-3 text-indigo-600">
                <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <AudienceIcon className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-black tracking-tight text-gray-900">
                  {editingId ? 'Edit Announcement' : copy.button}
                </h2>
              </div>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-2xl transition-colors text-gray-400" aria-label="Close modal">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-8 space-y-8 scrollbar-hide">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Announcement Title</label>
                <input
                  type="text"
                  placeholder="Enter short, catchy title..."
                  className="w-full bg-gray-50 px-6 py-4 rounded-3xl font-bold text-gray-900 focus:ring-2 focus:ring-indigo-600/10 focus:bg-white transition-all outline-none"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Full Content / Message</label>
                <textarea
                  placeholder="Provide all details about this update..."
                  className="w-full bg-gray-50 px-6 py-5 rounded-[2rem] font-medium text-gray-700 focus:ring-2 focus:ring-indigo-600/10 focus:bg-white transition-all outline-none min-h-[180px] leading-relaxed resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Feature Image</label>

                {imagePreview ? (
                  <div className="relative group rounded-[2rem] overflow-hidden bg-gray-100 border-2 border-dashed border-gray-200">
                    <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                          setImageUrl('');
                        }}
                        className="p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white hover:bg-white/40 transition-all transform hover:scale-110"
                        aria-label="Remove image"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-48 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2rem] cursor-pointer hover:bg-gray-100/50 hover:border-indigo-300 transition-all group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <div className="p-4 bg-white rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform">
                        <ImageIcon className="h-6 w-6 text-indigo-600" />
                      </div>
                      <p className="text-sm font-bold text-gray-900">Click to upload image</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG or WEBP (Max 5MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Target Selection</label>
                  <span className="text-[10px] font-bold text-indigo-600 italic bg-indigo-50 px-2 py-0.5 rounded-full">{copy.defaultTarget}</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                  <input
                    type="text"
                    placeholder={copy.filterPlaceholder}
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-gray-50/50 border border-gray-100 focus:border-indigo-500 transition-all outline-none text-xs"
                    value={targetSearch}
                    onChange={(e) => setTargetSearch(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                  {filteredTargetUsers.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedUsers(prev =>
                        prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id]
                      )}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
                        selectedUsers.includes(user.id)
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                          : 'bg-white border-gray-100 text-gray-500 hover:border-indigo-200'
                      }`}
                    >
                      {user.full_name || user.email}
                    </button>
                  ))}
                  {filteredTargetUsers.length === 0 && (
                    <p className="w-full text-xs text-gray-400 py-4 text-center">No {targetRole}s found.</p>
                  )}
                </div>
              </div>
            </form>

            <div className="px-8 py-8 border-t border-gray-50 bg-gray-50/30 flex items-center justify-end space-x-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-8 py-3 rounded-2xl font-bold text-gray-400 hover:text-gray-600 transition-colors text-sm"
              >
                Discard Changes
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-10 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-bold text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95 flex items-center disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Send className="h-5 w-5 mr-2" />
                )}
                {editingId ? 'Update & Sync' : 'Post Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PromoterAnnouncements() {
  return <Announcements targetRole="promoter" />;
}

export function ApproverAnnouncements() {
  return <Announcements targetRole="approver" />;
}
