import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Announcement, Promoter } from '../../types';
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
} from 'lucide-react';

export function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showAlert, showConfirm } = useModal();
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedPromoters, setSelectedPromoters] = useState<string[]>([]);
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [promoterSearch, setPromoterSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
    fetchPromoters();
  }, []);

  async function fetchAnnouncements() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (err) {
      console.error('Error fetching announcements:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPromoters() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'promoter');
      if (error) throw error;
      setPromoters(data || []);
    } catch (err) {
      console.error('Error fetching promoters:', err);
    }
  }

  const handleEdit = (ann: Announcement) => {
    setEditingId(ann.id);
    setTitle(ann.title);
    setDescription(ann.description);
    setImageUrl(ann.image_url || '');
    setImagePreview(ann.image_url || null);
    setImageFile(null);
    // In a real app, you'd fetch targets for this announcement
    setSelectedPromoters([]); 
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

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Announcement?',
      message: 'Are you sure you want to delete this announcement? This action cannot be undone.',
      severity: 'error'
    });
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      await logActivity('Delete Announcement', `Deleted announcement: "${announcements.find(a => a.id === id)?.title}"`);
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

  const sendPushNotifications = async (title: string, body: string) => {
    try {
      console.log('Push: Fetching tokens for promoters...');
      const { data: targetUsers, error } = await supabase
        .from('users')
        .select('expo_push_token')
        .eq('role', 'promoter')
        .not('expo_push_token', 'is', null);

      if (error) {
        console.error('Push: Database error:', error);
        return;
      }
      
      console.log(`Push: Found ${targetUsers?.length || 0} potential users.`);

      const tokens = targetUsers
        ?.map(u => u.expo_push_token)
        .filter(t => t && t.startsWith('ExponentPushToken'));

      if (!tokens || tokens.length === 0) {
        console.warn('Push: No valid ExponentPushTokens found. Make sure promoters have opened the new app.');
        return;
      }

      console.log(`Push: Sending to ${tokens.length} valid tokens...`);

      const messages = tokens.map(token => ({
        to: token,
        sound: 'default',
        title: title,
        body: body,
        priority: 'high',
        channelId: 'default',
        data: { type: 'announcement' },
      }));

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      console.log('Push: Expo API response:', result);
    } catch (err) {
      console.error('Push: Critical error:', err);
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

      if (editingId) {
        const { error } = await supabase
          .from('announcements')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
        await logActivity('Update Announcement', `Updated announcement: "${title}"`);
      } else {
        const { error } = await supabase
          .from('announcements')
          .insert([payload])
          .select();
        if (error) throw error;
        await logActivity('Create Announcement', `Posted new announcement: "${title}"`);
      }

      setIsModalOpen(false);
      resetForm();
      fetchAnnouncements();

      if (!editingId) {
        sendPushNotifications(title, description.substring(0, 100) + (description.length > 100 ? '...' : ''));
      }

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
    setSelectedPromoters([]);
    setIsModalOpen(false);
  };

  const filteredAnnouncements = announcements.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Announcements</h1>
          <p className="mt-1 text-sm text-gray-500">Send updates, news, and notifications to your promoters.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Announcement
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
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(ann.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
                    Global Distribution
                  </span>
                </div>
              </div>
            </div>
          ))}
          {filteredAnnouncements.length === 0 && (
            <div className="col-span-full py-32 text-center text-gray-400">
               <Megaphone className="h-16 w-16 mx-auto mb-4 opacity-10" />
               <p className="text-lg font-medium">No announcements found.</p>
               <p className="text-sm opacity-60">Create your first announcement to reach your promoters.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-500">
              <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                <div className="flex items-center space-x-3 text-indigo-600">
                   <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                      <Megaphone className="h-5 w-5" />
                   </div>
                   <h2 className="text-xl font-black tracking-tight text-gray-900">
                      {editingId ? 'Edit Announcement' : 'New Announcement'}
                   </h2>
                </div>
                <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-2xl transition-colors text-gray-400">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-8 space-y-8 scrollbar-hide">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Target Description</label>
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

                {/* Target Selection Placeholder */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                     <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Target Selection</label>
                     <span className="text-[10px] font-bold text-indigo-600 italic bg-indigo-50 px-2 py-0.5 rounded-full">Default: All Promoters</span>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                    <input
                      type="text"
                      placeholder="Filter targeted promoters..."
                      className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-gray-50/50 border border-gray-100 focus:border-indigo-500 transition-all outline-none text-xs"
                      value={promoterSearch}
                      onChange={(e) => setPromoterSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                    {promoters
                      .filter(p => p.email.toLowerCase().includes(promoterSearch.toLowerCase()))
                      .map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPromoters(prev => 
                            prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                          )}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
                            selectedPromoters.includes(p.id)
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                              : 'bg-white border-gray-100 text-gray-500 hover:border-indigo-200'
                          }`}
                        >
                          {p.email}
                        </button>
                      ))}
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
