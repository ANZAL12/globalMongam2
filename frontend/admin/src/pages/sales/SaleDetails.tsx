import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Sale } from '../../types';
import { logActivity } from '../../utils/logger';
import { useModal } from '../../context/ModalContext';
import { 
  ArrowLeft, 
  User, 
  ShoppingBag, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  FileText,
  CreditCard,
  Image as ImageIcon,
  ExternalLink,
  ChevronRight,
  IndianRupee,
  ShieldCheck,
  Phone,
  Smartphone,
  Copy,
  QrCode
} from 'lucide-react';

export function SaleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [incentiveAmount, setIncentiveAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const { showAlert, showConfirm } = useModal();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approverName, setApproverName] = useState<string | null>(null);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [isLatestDuplicate, setIsLatestDuplicate] = useState(false);
  const [approver, setApprover] = useState<{
    id: string;
    email: string | null;
    full_name: string | null;
    phone_number: string | null;
    expo_push_token: string | null;
    fcm_web_push_token: string | null;
  } | null>(null);
  const normalizeSerial = (serial: string | null | undefined) => serial?.trim().toLowerCase() || '';

  useEffect(() => {
    async function fetchSale(isInitial = true) {
      if (!id) return;
      if (isInitial) setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('sales')
          .select(`
            *,
            promoter:users!sales_promoter_id_fkey (
              full_name,
              email,
              phone_number,
              gpay_number,
              upi_id,
              approver_id
            ),
            approved_by_user:users!approved_by (
              full_name,
              email
            )
          `)
          .eq('id', id)
          .single();

        if (error) {
          console.error('Fetch error:', error);
          throw error;
        }
        
        const mappedResult = {
          ...data,
          promoter_name: data.promoter?.full_name || 'Promoter',
          promoter_email: data.promoter?.email || 'Unknown',
          promoter_phone: data.promoter?.phone_number || 'N/A',
          promoter_gpay: data.promoter?.gpay_number || 'N/A',
          promoter_upi: data.promoter?.upi_id || null,
        };
        
        setSale(mappedResult);
        setIncentiveAmount(data.incentive_amount?.toString() || '');
        setTransactionId(data.transaction_id || '');
        // Extract the name of whoever approved this sale
        const approvedByUser = (data as any).approved_by_user;
        setApproverName(approvedByUser?.full_name || approvedByUser?.email || null);
        const serialKey = normalizeSerial(data.serial_no);
        if (serialKey) {
          const { data: duplicateSales, error: duplicateError } = await supabase
            .from('sales')
            .select('id, serial_no, created_at')
            .ilike('serial_no', data.serial_no.trim());
          if (duplicateError) throw duplicateError;
          const duplicateMatches = (duplicateSales || []).filter((row: any) => normalizeSerial(row.serial_no) === serialKey);
          setDuplicateCount(duplicateMatches.length);
          const latestDuplicate = [...duplicateMatches].sort((a: any, b: any) => {
            const timeDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            if (timeDiff !== 0) return timeDiff;
            return String(b.id).localeCompare(String(a.id));
          })[0];
          setIsLatestDuplicate(duplicateMatches.length > 1 && latestDuplicate?.id === data.id);
        } else {
          setDuplicateCount(0);
          setIsLatestDuplicate(false);
        }

        const approverId = data.promoter?.approver_id as string | null | undefined;
        if (approverId) {
          const { data: approverData, error: approverError } = await supabase
            .from('users')
            .select('id, email, full_name, phone_number, expo_push_token, fcm_web_push_token')
            .eq('id', approverId)
            .single();
          if (!approverError && approverData) {
            setApprover(approverData);
          } else {
            setApprover(null);
          }
        } else {
          setApprover(null);
        }
      } catch (err) {
        console.error('Error fetching sale details:', err);
      } finally {
        if (isInitial) setLoading(false);
      }
    }


    fetchSale(true);

    if (!id) return;

    const channel = supabase
      .channel(`sale-detail-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        (payload) => {
          console.log('Real-time sale update:', payload);
          // Check if the change is for the current sale
          const recordId = (payload.new as any)?.id || (payload.old as any)?.id;
          if (recordId === id) {
            fetchSale(false); // Silent fetch, no loading spinner
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Admin does not approve/reject sales.
  // Approvers handle approvals; admin only handles payouts (mark paid) after approver approval.

  const handleMarkPaid = async () => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: adminData } = await supabase
        .from('users').select('email').eq('id', user!.id).single();
      const { error } = await supabase
        .from('sales')
        .update({ 
          status: 'paid',
          payment_status: 'paid',
          incentive_amount: incentiveAmount || sale?.incentive_amount,
          transaction_id: transactionId || sale?.transaction_id,
          paid_at: new Date().toISOString(),
          paid_by: user?.id,
          paid_by_email: adminData?.email || user?.email
        })
        .eq('id', id);

      if (error) throw error;
      await logActivity('Disburse Incentive', `Marked payment of ₹${incentiveAmount || sale?.incentive_amount} as paid for ${sale?.product_name}`);
      setSale(prev => prev ? { 
        ...prev, 
        status: 'paid',
        payment_status: 'paid',
        incentive_amount: (incentiveAmount || prev.incentive_amount?.toString() || '0'),
        transaction_id: transactionId || prev.transaction_id
      } : null);
      showAlert({
        title: 'Payment Confirmed',
        message: 'The incentive has been marked as paid.',
        severity: 'success'
      });
    } catch (err) {
      setError('Failed to mark as paid');
    } finally {
      setProcessing(false);
    }
  };

  const handleNotifyApprover = async () => {
    if (!sale || !approver) return;

    const confirmed = await showConfirm({
      title: 'Notify approver?',
      message: `Send a push reminder to ${approver.full_name || approver.email || 'the approver'} for this pending sale?`,
      severity: 'info'
    });
    if (!confirmed) return;

    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Call the Supabase Edge Function (handles both Firebase/FCM and Expo Push)
      const { data, error: functionError } = await supabase.functions.invoke('send-sale-notification', {
        body: {
          saleId: sale.id,
          approverId: approver.id,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        }
      });

      if (functionError) throw functionError;
      
      if (data?.success) {
        await logActivity(
          'Notify Approver',
          `Sent push reminder to approver ${approver.email || approver.id}`
        );

        showAlert({
          title: 'Notification sent',
          message: 'A push reminder was sent to the approver.',
          severity: 'success'
        });
      } else {
        throw new Error(data?.error || 'Failed to send notification');
      }
    } catch (e: any) {
      console.error('Push Notification Error:', e);
      showAlert({
        title: 'Failed to send',
        message: e?.message || 'Could not send push notification. Please ensure the approver has enabled notifications.',
        severity: 'error'
      });
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

  if (!sale) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-gray-900">Sale record not found</h2>
        <button onClick={() => navigate('/sales')} className="mt-4 text-indigo-600 font-medium hover:underline flex items-center justify-center mx-auto">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to sales List
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/sales')}
          className="p-2.5 rounded-2xl bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all hover:shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
            <span>Sales Dashboard</span>
            <ChevronRight className="h-3 w-3" />
            <span>Sale Details</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight truncate">
            {sale.product_name}
          </h1>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 font-medium text-sm flex items-center">
          <XCircle className="h-5 w-5 mr-3 shrink-0" />
          {error}
        </div>
      )}
      {duplicateCount > 1 && isLatestDuplicate && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest">Duplicate Serial Alert</p>
            <p className="text-sm font-semibold mt-1">
              This serial number is already used in {duplicateCount - 1} other uploaded sale(s).
            </p>
          </div>
          <button
            onClick={() =>
              navigate(
                `/sales/duplicates?serial=${encodeURIComponent(sale.serial_no || '')}&currentSaleId=${sale.id}`
              )
            }
            className="shrink-0 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-rose-700 transition-colors"
          >
            View All Matching Sales
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Sale Info Card */}
          <div className="bg-white shadow-sm border border-gray-100 rounded-3xl overflow-hidden">
            <div className="px-8 py-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                <div className="space-y-6">
                   <div className="flex items-center group">
                      <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 mr-4 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-0.5">Product Details</p>
                        <p className="text-sm font-bold text-gray-900 leading-tight">{sale.product_name}</p>
                        <p className="text-xs text-gray-500 font-medium">Model: {sale.model_no || 'N/A'}</p>
                      </div>
                   </div>

                   <div className="flex items-center group">
                      <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 mr-4 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-0.5">Submitted By</p>
                        <p className="text-sm font-bold text-gray-900 leading-tight">{sale.promoter_email}</p>
                        <div className="flex flex-col space-y-1 mt-1">
                          <div className="flex items-center text-xs text-gray-500 font-medium">
                            <Phone className="h-3 w-3 mr-1.5 text-gray-400" />
                            {sale.promoter_phone}
                          </div>
                          <div className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 w-fit cursor-pointer hover:bg-emerald-100 transition-colors"
                               onClick={() => {
                                 if (sale.promoter_gpay) {
                                   navigator.clipboard.writeText(sale.promoter_gpay);
                                   showAlert({
                                     title: 'Copied!',
                                     message: 'GPay Number copied to clipboard',
                                     severity: 'success'
                                   });
                                 }
                               }}>
                            <Smartphone className="h-3 w-3 mr-1.5 text-emerald-500" />
                            GPay: {sale.promoter_gpay}
                            <Copy className="h-2.5 w-2.5 ml-2 text-emerald-400" />
                          </div>
                        </div>
                      </div>
                   </div>

                   <div className="flex items-center group">
                      <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 mr-4 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-0.5">Invoice Details</p>
                        <p className="text-sm font-bold text-gray-900 leading-tight">Bill No: {sale.bill_no || 'N/A'}</p>
                        <p className="text-xs text-gray-500 font-medium">Serial: {sale.serial_no || 'N/A'}</p>
                      </div>
                   </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center group">
                      <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 mr-4 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        <IndianRupee className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-0.5">Bill Amount</p>
                        <p className="text-xl font-black text-gray-900 leading-tight">₹{parseFloat(sale.bill_amount).toLocaleString()}</p>
                      </div>
                   </div>

                   <div className="flex items-center group">
                      <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 mr-4 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-0.5">Submission Date</p>
                        <p className="text-sm font-bold text-gray-900 leading-tight">{new Date(sale.created_at).toLocaleString()}</p>
                      </div>
                   </div>

                   <div className="flex items-center group">
                      <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 mr-4 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-0.5">Verification Status</p>
                        <span className={`px-2.5 py-1 inline-flex text-[10px] leading-5 font-black rounded-full uppercase tracking-widest mt-1 ${
                          sale.status === 'approver_approved' || sale.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sale.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {sale.status === 'approver_approved' || sale.status === 'paid'
                            ? `${approverName || 'Approver'} Approved`
                            : sale.status.replace('_', ' ')}
                        </span>
                      </div>
                   </div>
                </div>
              </div>

              {/* Bill Image */}
              {sale.bill_image_url && (
                <div className="mt-12 pt-12 border-t border-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center">
                      <ImageIcon className="h-4 w-4 mr-2 text-indigo-500" />
                      Submitted Bill Attachment
                    </h3>
                    <a 
                      href={sale.bill_image_url || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:text-indigo-700 flex items-center group"
                    >
                      Open in New Tab
                      <ExternalLink className="ml-1 h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                  </div>
                  <div className="rounded-3xl overflow-hidden border border-gray-100 shadow-sm relative group bg-gray-50">
                    <img 
                      src={sale.bill_image_url || ''} 
                      alt="Bill Invoice" 
                      className="w-full h-auto max-h-[500px] object-contain mx-auto transition-transform duration-700 group-hover:scale-[1.02]" 
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-8">
           {/* Admin Actions Panel */}
           <div className="bg-white shadow-sm border border-gray-100 rounded-3xl overflow-hidden p-8 sticky top-8">
             <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                Actions & Management
             </h3>

             <div className="space-y-6">
                {(sale.status === 'pending' || sale.status === 'approver_approved') ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                          Assign Incentive (₹)
                       </label>
                       <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="number"
                            placeholder="0.00"
                            className="bg-gray-50 border-none w-full pl-10 pr-4 py-3 rounded-2xl text-lg font-black text-gray-900 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                            value={incentiveAmount}
                            onChange={(e) => setIncentiveAmount(e.target.value)}
                          />
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                          Transaction ID (Optional)
                       </label>
                       <input
                         type="text"
                         placeholder="TXN12345678"
                         className="bg-gray-50 border-none w-full px-4 py-3 rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                         value={transactionId}
                         onChange={(e) => setTransactionId(e.target.value)}
                       />
                    </div>

                    {sale.status === 'pending' ? (
                      <div className="space-y-3">
                        <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100 text-orange-800 text-sm font-semibold">
                          Waiting for approver review. Admin cannot approve/reject sales.
                        </div>

                        <div className="bg-white rounded-2xl p-4 border border-gray-100">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                            Assigned Approver
                          </p>
                          {approver ? (
                            <div className="space-y-1">
                              <div className="text-sm font-bold text-gray-900">
                                {approver.full_name || 'Approver'}
                              </div>
                              <div className="text-xs text-gray-600 font-medium">{approver.email || '—'}</div>
                              <div className="text-xs text-gray-600 font-medium">
                                Phone: {approver.phone_number || '—'}
                              </div>
                              <button
                                onClick={handleNotifyApprover}
                                disabled={processing}
                                className="mt-3 w-full px-4 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 disabled:opacity-50"
                              >
                                Send Push Reminder
                              </button>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500 font-medium">
                              No approver assigned to this promoter.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Finalized Outcome</p>
                    <div className="flex items-center justify-between mb-4">
                       <span className="text-sm font-medium text-gray-500">Incentive Awarded:</span>
                       <span className="text-xl font-black text-emerald-600">₹{sale.incentive_amount || '0'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-sm font-medium text-gray-500">Current Status:</span>
                       <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                         (sale.status as string) === 'approver_approved' || sale.status === 'paid'
                           ? 'bg-emerald-100 text-emerald-800'
                           : 'bg-rose-100 text-rose-800'
                       }`}>
                         {(sale.status as string) === 'approver_approved' || sale.status === 'paid' ? `${approverName || 'Approver'} Approved` : sale.status}
                       </span>
                    </div>
                    {sale.transaction_id && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                         <span className="text-sm font-medium text-gray-500">Transaction ID:</span>
                         <span className="text-sm font-bold text-gray-900">{sale.transaction_id}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Show QR Code only when ready to pay and amount > 0 */}
                {(sale.status === 'approver_approved') && sale.payment_status !== 'paid' && parseFloat(incentiveAmount || sale.incentive_amount || '0') > 0 && (
                  <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 space-y-4">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Scan to Pay via UPI</p>
                    
                    {sale.promoter_upi ? (
                      <div className="flex flex-col items-center space-y-3">
                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-indigo-50">
                          {(() => {
                            const upiAddr = sale.promoter_upi;
                            const amt = parseFloat(incentiveAmount || sale.incentive_amount || '0').toFixed(2);
                            const payeeName = (sale.promoter_name || 'Promoter').substring(0, 20); // GPay limit
                            const upiUrl = `upi://pay?pa=${upiAddr}&pn=${encodeURIComponent(payeeName)}&am=${amt}&cu=INR`;
                            
                            return (
                              <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}`} 
                                alt="UPI QR Code" 
                                className="w-40 h-40"
                              />
                            );
                          })()}
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-indigo-900">{sale.promoter_upi}</p>
                          <p className="text-[10px] text-indigo-500 font-medium">Amount: ₹{parseFloat(incentiveAmount || sale.incentive_amount || '0').toFixed(2)}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-3">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 flex flex-col items-center justify-center w-48 h-48">
                          <div className="relative mb-3">
                            <QrCode className="h-12 w-12 text-gray-300 opacity-60" />
                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                              <XCircle className="h-5 w-5 text-rose-500" />
                            </div>
                          </div>
                          <div className="text-center">
                             <p className="text-xs font-bold text-rose-600 mb-1 leading-tight">QR Cannot Be Created</p>
                             <p className="text-[10px] text-gray-500 font-medium leading-tight">UPI ID is missing.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {sale.status === 'approver_approved' && sale.payment_status !== 'paid' && (
                  <button
                    onClick={handleMarkPaid}
                    disabled={processing}
                    className="w-full flex items-center justify-center px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                  >
                    <CreditCard className="h-5 w-5 mr-3" />
                    Mark as Paid to Promoter
                  </button>
                )}

                {sale.payment_status === 'paid' && (
                  <div className="flex flex-col items-center justify-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-700 font-bold text-sm space-y-2">
                    <div className="flex items-center">
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Incentive Disbursement Complete
                    </div>
                    {sale.paid_at && (
                      <div className="text-xs font-medium text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
                        Paid on {new Date(sale.paid_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                )}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
