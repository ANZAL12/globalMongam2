import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useModal } from '../../context/ModalContext';

type RequestRow = {
  id: string;
  created_at: string;
  approver_id: string;
  email: string;
  password: string;
  full_name: string;
  shop_name: string;
  phone_number: string;
  gpay_number: string;
  upi_id: string;
  status: 'pending' | 'approved' | 'rejected';
  approver?: {
    full_name: string;
    email: string;
  };
};

export function PendingPromoters() {
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useModal();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('promoter_requests')
        .select('*, approver:users!approver_id(full_name, email)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRows((data || []) as RequestRow[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const approveRequest = async (row: RequestRow) => {
    const confirmed = await showConfirm({
      title: 'Approve promoter request?',
      message: `Create promoter account for ${row.full_name} (${row.email})?`,
      severity: 'info',
    });
    if (!confirmed) return;

    setProcessingId(row.id);
    try {
      const createUser = (window as any)?.electron?.supabase?.createUser as
        | ((payload: any) => Promise<{ success: boolean; error?: string }>)
        | undefined;
      if (!createUser) {
        throw new Error('Approval is available only in Electron desktop mode.');
      }

      const result = await createUser({
        email: row.email,
        password: row.password,
        full_name: row.full_name,
        shop_name: row.shop_name,
        phone_number: row.phone_number,
        gpay_number: row.gpay_number,
        upi_id: row.upi_id,
        role: 'promoter',
        approver_id: row.approver_id,
      });
      if (!result.success) throw new Error(result.error || 'Failed to create promoter user');

      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase
        .from('promoter_requests')
        .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user?.id || null })
        .eq('id', row.id);

      showAlert({ title: 'Approved', message: 'Promoter account created successfully.', severity: 'success' });
      fetchRows();
    } catch (e: any) {
      showAlert({ title: 'Approval failed', message: e?.message || 'Could not approve request.', severity: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  const rejectRequest = async (row: RequestRow) => {
    const confirmed = await showConfirm({
      title: 'Reject request?',
      message: `Reject promoter request for ${row.full_name}?`,
      severity: 'warning',
    });
    if (!confirmed) return;

    setProcessingId(row.id);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase
        .from('promoter_requests')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user?.id || null })
        .eq('id', row.id);
      showAlert({ title: 'Rejected', message: 'Request has been rejected.', severity: 'info' });
      fetchRows();
    } catch (e: any) {
      showAlert({ title: 'Reject failed', message: e?.message || 'Could not reject request.', severity: 'error' });
    } finally {
      setProcessingId(null);
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
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Pending Promoter Requests</h1>
          <p className="text-sm text-gray-500 mt-1">Requests submitted by approvers awaiting admin action.</p>
        </div>
        <button
          onClick={() => navigate('/promoters')}
          className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Back to Promoters
        </button>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Promoter</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Shop</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Requested</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">{row.full_name}</div>
                    <div className="text-xs text-gray-500">{row.email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <div>{row.phone_number}</div>
                    <div className="text-xs text-gray-500">GPay: {row.gpay_number}</div>
                    <div className="text-xs text-gray-500">UPI: {row.upi_id}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{row.shop_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div>{new Date(row.created_at).toLocaleString()}</div>
                    {row.approver && (
                      <div className="text-xs text-indigo-600 font-semibold mt-1">
                        By: {row.approver.full_name}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        onClick={() => navigate(`/promoters/pending/${row.id}`)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 disabled:opacity-50"
                      >
                        Review
                      </button>
                      <button
                        onClick={() => approveRequest(row)}
                        disabled={processingId === row.id}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => rejectRequest(row)}
                        disabled={processingId === row.id}
                        className="px-3 py-1.5 rounded-lg bg-rose-100 text-rose-700 text-xs font-bold hover:bg-rose-200 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No pending promoter requests.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

