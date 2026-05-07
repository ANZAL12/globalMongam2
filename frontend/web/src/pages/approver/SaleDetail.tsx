import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { ArrowLeft, CheckCircle2, XCircle, Clock, MapPin, Phone, User, Receipt } from 'lucide-react';

export default function ApproverSaleDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [sale, setSale] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [duplicateCount, setDuplicateCount] = useState(0);

    const normalizeSerial = (serial: string | null | undefined) => serial?.trim().toLowerCase() || '';

    useEffect(() => {
        async function fetchSale() {
            if (!id) return;
            try {
                const { data, error } = await supabase
                    .from('sales')
                    .select(`
                        *,
                        promoter:users!promoter_id (
                            full_name,
                            email,
                            phone_number,
                            shop_name
                        )
                    `)
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setSale(data);

                const serialKey = normalizeSerial(data?.serial_no);
                if (serialKey) {
                    const { data: duplicateSales, error: duplicateError } = await supabase
                        .from('sales')
                        .select('id, serial_no')
                        .ilike('serial_no', data.serial_no.trim());

                    if (duplicateError) throw duplicateError;
                    const duplicateMatches = (duplicateSales || []).filter((row: any) => normalizeSerial(row.serial_no) === serialKey);
                    setDuplicateCount(duplicateMatches.length);
                } else {
                    setDuplicateCount(0);
                }
            } catch (err) {
                console.error('Error fetching sale details:', err);
                navigate('/approver/sales');
            } finally {
                setLoading(false);
            }
        }
        fetchSale();
    }, [id, navigate]);

    const handleAction = async (newStatus: 'approver_approved' | 'rejected') => {
        if (!id) return;
        setProcessing(true);
        try {
            const { error } = await supabase
                .from('sales')
                .update({ 
                    status: newStatus,
                    approved_at: newStatus === 'approver_approved' ? new Date().toISOString() : null,
                    approved_by: (await supabase.auth.getUser()).data.user?.id
                })
                .eq('id', id);

            if (error) throw error;
            setSale({ ...sale, status: newStatus });
            alert(`Sale ${newStatus === 'approver_approved' ? 'Approved' : 'Rejected'} successfully!`);
            navigate('/approver/sales');
        } catch (err) {
            console.error('Error updating sale:', err);
            alert('Failed to update sale status.');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-1 justify-center items-center h-full bg-[#f5f5f5]">
                <div className="w-8 h-8 border-4 border-[#1976d2] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'approver_approved': return { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2, text: 'Approved by you' };
            case 'approved': return { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2, text: 'Finalized by Admin' };
            case 'rejected': return { color: 'text-red-600', bg: 'bg-red-50', icon: XCircle, text: 'Rejected' };
            case 'paid': return { color: 'text-indigo-600', bg: 'bg-indigo-50', icon: CheckCircle2, text: 'Payment Complete' };
            default: return { color: 'text-orange-600', bg: 'bg-orange-50', icon: Clock, text: 'Pending Review' };
        }
    };

    const statusInfo = getStatusInfo(sale.status);
    const StatusIcon = statusInfo.icon;

    return (
        <div className="flex-1 bg-[#f5f5f5] min-h-screen pb-[100px]">
            <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center">
                <button onClick={() => navigate('/approver/sales')} className="mr-4 p-1 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Sale Details</h1>
            </header>

            <div className="p-4 space-y-4">
                {/* Status Banner */}
                <div className={`${statusInfo.bg} ${statusInfo.color} p-4 rounded-2xl border border-current/10 flex items-center space-x-3`}>
                    <StatusIcon size={24} />
                    <span className="font-bold uppercase tracking-wide">{statusInfo.text}</span>
                </div>
                {duplicateCount > 1 && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-2xl border border-red-200">
                        <span className="font-bold uppercase tracking-wide text-sm">
                            Duplicate Serial Alert
                        </span>
                        <p className="text-sm font-semibold mt-1">
                            This serial number already exists in {duplicateCount - 1} other uploaded sale(s).
                        </p>
                    </div>
                )}

                {/* Product Card */}
                <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Product</p>
                            <h3 className="text-lg font-black text-gray-900">{sale.product_name}</h3>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Bill Amount</p>
                            <p className="text-xl font-black text-indigo-600">₹{parseFloat(sale.bill_amount).toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 flex items-center">
                                <Receipt size={12} className="mr-1" /> Bill No
                            </p>
                            <p className="text-sm font-bold text-gray-800">{sale.bill_no}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 flex items-center">
                                <Clock size={12} className="mr-1" /> Date
                            </p>
                            <p className="text-sm font-bold text-gray-800">{new Date(sale.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>

                {/* Promoter Card */}
                <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                    <h4 className="text-sm font-black text-gray-900 flex items-center">
                        <User size={16} className="mr-2 text-indigo-500" /> Promoter Info
                    </h4>
                    <div className="space-y-3">
                        <div className="flex items-center text-sm">
                            <User size={14} className="text-gray-400 mr-3 shrink-0" />
                            <span className="font-bold text-gray-700">{sale.promoter?.full_name}</span>
                        </div>
                        <div className="flex items-center text-sm">
                            <MapPin size={14} className="text-gray-400 mr-3 shrink-0" />
                            <span className="font-medium text-gray-600">{sale.promoter?.shop_name}</span>
                        </div>
                        <div className="flex items-center text-sm">
                            <Phone size={14} className="text-gray-400 mr-3 shrink-0" />
                            <span className="font-medium text-gray-600">{sale.promoter?.phone_number}</span>
                        </div>
                    </div>
                </div>

                {/* Bill Image */}
                <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                    <h4 className="text-sm font-black text-gray-900 flex items-center">
                        <Receipt size={16} className="mr-2 text-indigo-500" /> Invoice Image
                    </h4>
                    <div className="rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                        <img src={sale.bill_image_url} alt="Bill" className="w-full h-auto object-contain max-h-[300px]" />
                    </div>
                </div>

                {/* Action Buttons */}
                {sale.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <button 
                            onClick={() => handleAction('rejected')}
                            disabled={processing}
                            className="bg-white border-2 border-red-100 text-red-600 py-4 rounded-2xl font-bold uppercase tracking-widest text-sm active:scale-95 transition-all disabled:opacity-50"
                        >
                            Reject
                        </button>
                        <button 
                            onClick={() => handleAction('approver_approved')}
                            disabled={processing}
                            className="bg-indigo-600 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-sm shadow-lg shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50"
                        >
                            Approve
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
