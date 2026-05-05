import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Mail, Phone, ShieldCheck, Calendar, Smartphone, Pencil, Check, X, RefreshCw } from 'lucide-react';
import { useModal } from '../../context/ModalContext';

type ApproverRow = {
  id: string;
  full_name: string | null;
  email: string;
  phone_number: string | null;
  role: string;
  is_active: boolean | null;
  created_at: string;
  expo_push_token?: string | null;
};

type PromoterRow = {
  id: string;
  full_name: string | null;
  email: string;
  phone_number: string | null;
  shop_name: string | null;
  is_active: boolean | null;
};

export function ApproverDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useModal();
  const [approver, setApprover] = useState<ApproverRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignedPromotersCount, setAssignedPromotersCount] = useState(0);
  const [promoters, setPromoters] = useState<PromoterRow[]>([]);
  const [processingAction, setProcessingAction] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [showNetworkHint, setShowNetworkHint] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowNetworkHint(true);
    }, 8000);

    async function fetchApprover() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, email, phone_number, role, is_active, created_at, expo_push_token')
          .eq('id', id)
          .eq('role', 'approver')
          .single();

        if (error) throw error;
        setApprover(data as ApproverRow);
        setPhoneDraft(data.phone_number || '');

        const { count } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'promoter')
          .eq('approver_id', id);
        setAssignedPromotersCount(count || 0);

        const { data: promoterData, error: promoterError } = await supabase
          .from('users')
          .select('id, full_name, email, phone_number, shop_name, is_active')
          .eq('role', 'promoter')
          .eq('approver_id', id)
          .order('created_at', { ascending: false });
        if (!promoterError) {
          setPromoters((promoterData || []) as PromoterRow[]);
        } else {
          setPromoters([]);
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load approver details.');
      } finally {
        setLoading(false);
        window.clearTimeout(timer);
      }
    }

    fetchApprover();
    return () => {
      window.clearTimeout(timer);
    };
  }, [id, reloadKey]);

  const handleToggleDisable = async () => {
    if (!approver) return;
    const willDisable = approver.is_active !== false;
    const confirmed = await showConfirm({
      title: willDisable ? 'Disable approver?' : 'Enable approver?',
      message: willDisable
        ? 'This approver will no longer be able to sign in.'
        : 'This approver account will be re-enabled.',
      severity: willDisable ? 'warning' : 'info',
    });
    if (!confirmed) return;

    setProcessingAction(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !willDisable })
        .eq('id', approver.id)
        .eq('role', 'approver');
      if (error) throw error;

      setApprover((prev) => (prev ? { ...prev, is_active: !willDisable } : prev));
      showAlert({
        title: willDisable ? 'Approver disabled' : 'Approver enabled',
        message: willDisable ? 'The account has been disabled.' : 'The account has been enabled.',
        severity: 'success',
      });
    } catch (e: any) {
      showAlert({
        title: 'Action failed',
        message: e?.message || 'Could not update approver status.',
        severity: 'error',
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleDeleteApprover = async () => {
    if (!approver) return;
    const DELETE_PHRASE = 'DELETE APPROVER';
    const confirmed = await showConfirm({
      title: 'Delete approver?',
      message:
        assignedPromotersCount > 0
          ? `This will delete the approver and unassign ${assignedPromotersCount} promoter(s). Continue?`
          : 'This will permanently delete the approver profile. Continue?',
      severity: 'warning',
    });
    if (!confirmed) return;

    const typed = window.prompt(
      `Type "${DELETE_PHRASE}" below to confirm permanent deletion of ${approver.full_name || approver.email}.`
    );
    if (typed !== DELETE_PHRASE) {
      showAlert({
        title: 'Deletion cancelled',
        message: 'Confirmation text did not match. Approver was not deleted.',
        severity: 'info',
      });
      return;
    }

    setProcessingAction(true);
    try {
      if (assignedPromotersCount > 0) {
        const { error: unassignError } = await supabase
          .from('users')
          .update({ approver_id: null })
          .eq('role', 'promoter')
          .eq('approver_id', approver.id);
        if (unassignError) throw unassignError;
      }

      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', approver.id)
        .eq('role', 'approver');
      if (deleteError) throw deleteError;

      showAlert({
        title: 'Approver deleted',
        message: 'The approver account has been removed.',
        severity: 'success',
        onConfirm: () => navigate('/approvers'),
      });
    } catch (e: any) {
      showAlert({
        title: 'Delete failed',
        message: e?.message || 'Could not delete approver.',
        severity: 'error',
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleSavePhone = async () => {
    if (!approver) return;
    setSavingPhone(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ phone_number: phoneDraft.trim() || null })
        .eq('id', approver.id)
        .eq('role', 'approver');
      if (error) throw error;

      setApprover((prev) => (prev ? { ...prev, phone_number: phoneDraft.trim() || null } : prev));
      setIsEditingPhone(false);
      showAlert({
        title: 'Phone updated',
        message: 'Approver phone number updated successfully.',
        severity: 'success',
      });
    } catch (e: any) {
      showAlert({
        title: 'Update failed',
        message: e?.message || 'Could not update phone number.',
        severity: 'error',
      });
    } finally {
      setSavingPhone(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        {showNetworkHint && (
          <div className="mt-4 max-w-md text-center bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-amber-800 text-sm font-medium">
            Taking longer than expected. Please check your internet/Wi-Fi connection and try again.
            {navigator.onLine === false ? ' You appear to be offline right now.' : ''}
          </div>
        )}
      </div>
    );
  }

  if (error || !approver) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/approvers')}
          className="mb-4 inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-500"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Approvers
        </button>
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-rose-700 text-sm font-medium">
          {error || 'Approver not found.'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/approvers')}
          className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-500"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Approvers
        </button>
        <button
          onClick={() => setReloadKey((prev) => prev + 1)}
          className="inline-flex items-center px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
          title="Refresh data"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          {approver.full_name || 'Approver'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Approver account details</p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Email</div>
            <div className="mt-2 flex items-center text-sm font-medium text-gray-800">
              <Mail className="h-4 w-4 mr-2 text-gray-400" />
              {approver.email}
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Phone</div>
              {!isEditingPhone ? (
                <button
                  onClick={() => setIsEditingPhone(true)}
                  className="inline-flex items-center text-gray-400 hover:text-indigo-600 transition-colors"
                  title="Edit phone number"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <div className="mt-2">
              {!isEditingPhone ? (
                <div className="flex items-center text-sm font-medium text-gray-800">
                  <Phone className="h-4 w-4 mr-2 text-gray-400" />
                  {approver.phone_number || 'Not provided'}
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="tel"
                    value={phoneDraft}
                    onChange={(e) => setPhoneDraft(e.target.value)}
                    placeholder="Enter phone number"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSavePhone}
                      disabled={savingPhone}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      {savingPhone ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setPhoneDraft(approver.phone_number || '');
                        setIsEditingPhone(false);
                      }}
                      disabled={savingPhone}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-300 disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Role</div>
            <div className="mt-2 flex items-center text-sm font-medium text-gray-800">
              <ShieldCheck className="h-4 w-4 mr-2 text-gray-400" />
              {approver.role}
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Joined</div>
            <div className="mt-2 flex items-center text-sm font-medium text-gray-800">
              <Calendar className="h-4 w-4 mr-2 text-gray-400" />
              {new Date(approver.created_at).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Push Notifications</div>
          <div className="mt-2 flex items-center text-sm font-medium text-gray-800">
            <Smartphone className="h-4 w-4 mr-2 text-gray-400" />
            {approver.expo_push_token ? 'Enabled on mobile device' : 'No mobile push token'}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Assigned Promoters</div>
          <div className="mt-2 text-sm font-bold text-gray-900">{assignedPromotersCount}</div>
        </div>

        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Promoters Under This Approver
          </div>
          {promoters.length === 0 ? (
            <div className="text-sm text-gray-500 font-medium">No promoters assigned yet.</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-12 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                <div className="col-span-3">Name</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-2">Phone</div>
                <div className="col-span-3">Shop</div>
                <div className="col-span-1 text-right">Status</div>
              </div>
              {promoters.map((promoter) => (
                <button
                  key={promoter.id}
                  onClick={() => navigate(`/promoters/${promoter.id}`)}
                  className="w-full grid grid-cols-12 px-4 py-3 text-left border-b last:border-b-0 border-gray-100 hover:bg-indigo-50/40 transition-colors items-center"
                >
                  <div className="col-span-3 text-sm font-semibold text-gray-900 truncate">{promoter.full_name || 'No Name'}</div>
                  <div className="col-span-3 text-xs text-gray-600 truncate">{promoter.email}</div>
                  <div className="col-span-2 text-xs text-gray-600 truncate">{promoter.phone_number || 'No phone'}</div>
                  <div className="col-span-3 text-xs text-gray-500 truncate">{promoter.shop_name || 'No shop name'}</div>
                  <div className="col-span-1 text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        promoter.is_active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {promoter.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleToggleDisable}
            disabled={processingAction}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${
              approver.is_active !== false
                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
            }`}
          >
            {processingAction
              ? 'Please wait...'
              : approver.is_active !== false
              ? 'Disable Approver'
              : 'Enable Approver'}
          </button>
          <button
            onClick={handleDeleteApprover}
            disabled={processingAction}
            className="px-4 py-2.5 rounded-xl text-sm font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 transition-all disabled:opacity-50"
          >
            {processingAction ? 'Please wait...' : 'Delete Approver'}
          </button>
        </div>
      </div>
    </div>
  );
}

