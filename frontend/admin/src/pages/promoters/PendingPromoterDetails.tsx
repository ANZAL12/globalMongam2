import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import { useModal } from '../../context/ModalContext';
import { 
  ArrowLeft, 
  Store, 
  User, 
  Phone, 
  CreditCard,
  AlertCircle,
  Save,
  CheckCircle2,
  XCircle,
  Mail
} from 'lucide-react';

export function PendingPromoterDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useModal();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [shopName, setShopName] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gPayNumber, setGPayNumber] = useState('');
  const [upiId, setUpiId] = useState('');
  const [password, setPassword] = useState('');
  const [approverId, setApproverId] = useState('');
  const [approverName, setApproverName] = useState('');

  useEffect(() => {
    async function fetchRequest() {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('promoter_requests')
          .select('*, approver:users!approver_id(full_name)')
          .eq('id', id)
          .single();

        if (error) throw error;
        
        if (data.status !== 'pending') {
          navigate('/promoters/pending');
          showAlert({ title: 'Notice', message: 'This request is no longer pending.', severity: 'info' });
          return;
        }

        setEmail(data.email || '');
        setFullName(data.full_name || '');
        setShopName(data.shop_name || '');
        setPhoneNumber(data.phone_number || '');
        setGPayNumber(data.gpay_number || '');
        setUpiId(data.upi_id || '');
        setPassword(data.password || '');
        setApproverId(data.approver_id || '');
        setApproverName(data.approver?.full_name || 'Unknown Approver');
        
      } catch (err) {
        console.error('Error fetching request details:', err);
        setError('Failed to load request details.');
      } finally {
        setLoading(false);
      }
    }

    fetchRequest();
  }, [id, navigate, showAlert]);

  const handleSave = async (e: React.FormEvent) => {
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
      const updateData = {
        full_name: fullName.trim(),
        shop_name: shopName.trim(),
        phone_number: phoneNumber.trim(),
        gpay_number: gPayNumber.trim(),
        upi_id: upiId.trim(),
      };

      const { error: updateError } = await supabase
        .from('promoter_requests')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      showAlert({
        title: 'Success',
        message: 'Request details have been updated.',
        severity: 'success'
      });
    } catch (err: any) {
      console.error('Error updating request:', err);
      setError(err.message || 'Failed to update request details');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    const confirmed = await showConfirm({
      title: 'Approve promoter request?',
      message: `Create promoter account for ${fullName} (${email})?`,
      severity: 'info',
    });
    if (!confirmed) return;

    setProcessing(true);
    setError(null);
    try {
      const createUser = (window as any)?.electron?.supabase?.createUser as
        | ((payload: any) => Promise<{ success: boolean; error?: string }>)
        | undefined;
        
      if (!createUser) {
        throw new Error('Approval is available only in Electron desktop mode.');
      }

      const result = await createUser({
        email: email,
        password: password,
        full_name: fullName,
        shop_name: shopName,
        phone_number: phoneNumber,
        gpay_number: gPayNumber,
        upi_id: upiId,
        role: 'promoter',
        approver_id: approverId,
      });
      
      if (!result.success) throw new Error(result.error || 'Failed to create promoter user');

      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from('promoter_requests')
        .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user?.id || null })
        .eq('id', id);

      showAlert({ title: 'Approved', message: 'Promoter account created successfully.', severity: 'success' });
      navigate('/promoters/pending');
    } catch (err: any) {
      console.error('Approval failed:', err);
      setError(err.message || 'Could not approve request.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    const confirmed = await showConfirm({
      title: 'Reject request?',
      message: `Reject promoter request for ${fullName}?`,
      severity: 'warning',
    });
    if (!confirmed) return;

    setProcessing(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from('promoter_requests')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user?.id || null })
        .eq('id', id);
        
      showAlert({ title: 'Rejected', message: 'Request has been rejected.', severity: 'info' });
      navigate('/promoters/pending');
    } catch (err: any) {
      console.error('Reject failed:', err);
      setError(err.message || 'Could not reject request.');
    } finally {
      setProcessing(false);
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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/promoters/pending')}
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all hover:shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Review Promoter Request</h1>
            <p className="mt-1 text-sm text-gray-500">
              Submitted by <span className="font-semibold text-indigo-600">{approverName}</span>. Edit details and approve or reject.
            </p>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleReject}
            disabled={processing || saving}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-bold rounded-xl text-rose-700 bg-rose-100 hover:bg-rose-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50 transition-all"
          >
            <XCircle className="-ml-1 mr-2 h-5 w-5" />
            Reject
          </button>
          <button
            onClick={handleApprove}
            disabled={processing || saving}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-all"
          >
            <CheckCircle2 className="-ml-1 mr-2 h-5 w-5" />
            Approve
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden p-6 md:p-8">
        <form onSubmit={handleSave} className="space-y-6">
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
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 flex items-center">
                <Mail className="h-4 w-4 mr-2 text-gray-400" />
                Email Address
              </label>
              <input
                type="email"
                disabled
                className="block w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                value={email}
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
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end space-x-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={saving || processing}
              className="inline-flex items-center px-6 py-2.5 border border-transparent shadow-sm text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="-ml-1 mr-2 h-4 w-4" />
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
