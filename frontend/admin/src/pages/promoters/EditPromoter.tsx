import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import { logActivity } from '../../utils/logger';
import { useModal } from '../../context/ModalContext';
import { 
  ArrowLeft, 
  Store, 
  User, 
  Phone, 
  CreditCard,
  AlertCircle,
  Save
} from 'lucide-react';
import type { Promoter } from '../../types';

export function EditPromoter() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showAlert } = useModal();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [shopName, setShopName] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gPayNumber, setGPayNumber] = useState('');
  const [upiId, setUpiId] = useState('');

  useEffect(() => {
    async function fetchPromoter() {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        
        setFullName(data.full_name || '');
        setShopName(data.shop_name || '');
        setPhoneNumber(data.phone_number || '');
        setGPayNumber(data.gpay_number || '');
        // Supabase schema might not have upi_id yet, default to empty string if undefined
        setUpiId(data.upi_id || ''); 
        
      } catch (err) {
        console.error('Error fetching promoter details:', err);
        setError('Failed to load promoter details.');
      } finally {
        setLoading(false);
      }
    }

    fetchPromoter();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    
    setSaving(true);
    setError(null);

    if (!shopName.trim() || !fullName.trim() || !phoneNumber.trim()) {
      setError('Please fill in Name, Place (Shop), and Phone Number');
      setSaving(false);
      return;
    }

    try {
      const updateData: any = {
        full_name: fullName.trim(),
        shop_name: shopName.trim(),
        phone_number: phoneNumber.trim(),
        gpay_number: gPayNumber.trim(),
        upi_id: upiId.trim(),
      };

      const { data: updatedData, error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select();

      if (updateError) {
        // If error is about upi_id column not existing, we can catch it
        if (updateError.message.includes('upi_id')) {
           throw new Error('Database is missing upi_id column. Please add it in Supabase.');
        }
        throw updateError;
      }
      
      if (!updatedData || updatedData.length === 0) {
        throw new Error("Update failed. You might not have the correct permissions to edit this user's details.");
      }

      await logActivity('Update Promoter', `Updated details for ${fullName}`);

      showAlert({
        title: 'Success',
        message: 'Promoter details have been updated successfully.',
        severity: 'success'
      });
      
      navigate('/promoters/manage');
    } catch (err: any) {
      console.error('Error updating promoter:', err);
      setError(err.message || 'Failed to update promoter details');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/promoters/manage')}
          className="p-2 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all hover:shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Edit Promoter Details</h1>
          <p className="mt-1 text-sm text-gray-500">Update personal and payment information.</p>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-center space-x-3 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 animate-in slide-in-from-top-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 flex items-center">
                <User className="h-4 w-4 mr-2 text-gray-400" />
                Full Name *
              </label>
              <input
                type="text"
                required
                className="block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 flex items-center">
                <Store className="h-4 w-4 mr-2 text-gray-400" />
                Place (Shop Name) *
              </label>
              <input
                type="text"
                required
                className="block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                placeholder="Electronics Emporium"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 flex items-center">
                <Phone className="h-4 w-4 mr-2 text-gray-400" />
                Phone Number *
              </label>
              <input
                type="tel"
                required
                className="block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                placeholder="+91 88888 88888"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 flex items-center">
                <CreditCard className="h-4 w-4 mr-2 text-gray-400" />
                GPay Number
              </label>
              <input
                type="tel"
                className="block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                placeholder="+91 88888 88888"
                value={gPayNumber}
                onChange={(e) => setGPayNumber(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 flex items-center">
                <CreditCard className="h-4 w-4 mr-2 text-gray-400" />
                UPI ID
              </label>
              <input
                type="text"
                className="block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                placeholder="username@upi"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/promoters/manage')}
              className="px-6 py-3 border border-gray-200 text-sm font-bold text-gray-600 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-8 py-3 border border-transparent shadow-sm text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all active:scale-95"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
