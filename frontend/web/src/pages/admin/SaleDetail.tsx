import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, X, ZoomIn, Copy, QrCode } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { logAdminAction, ActionFlag } from '../../services/logger';

type SaleDetail = {
    id: string;
    promoter_name: string;
    promoter_email: string;
    product_name: string;
    model_no: string | null;
    serial_no: string | null;
    bill_no: string | null;
    bill_amount: string;
    bill_image: string | null;
    status: string;
    incentive_amount: string | null;
    payment_status: string;
    created_at: string;
    paid_at: string | null;
    transaction_id: string | null;
    promoter_phone: string | null;
    promoter_gpay: string | null;
    promoter_upi: string | null;
};

export default function AdminSaleDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [sale, setSale] = useState<SaleDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [transactionIdInput, setTransactionIdInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isImageModalVisible, setIsImageModalVisible] = useState(false);

    const fetchSaleDetails = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('sales')
                .select(`
                    *,
                    promoter:users!promoter_id (
                        full_name,
                        email,
                        phone_number,
                        gpay_number,
                        upi_id
                    )
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!data) {
                alert('Sale not found.');
                navigate(-1);
                return;
            }

            const formattedSale: SaleDetail = {
                ...data,
                promoter_name: data.promoter?.full_name || 'Promoter',
                promoter_email: data.promoter?.email || 'Unknown',
                promoter_phone: data.promoter?.phone_number || 'N/A',
                promoter_gpay: data.promoter?.gpay_number || 'N/A',
                promoter_upi: data.promoter?.upi_id || null,
                bill_image: data.bill_image_url,
            };

            setSale(formattedSale);
            setTransactionIdInput(data.transaction_id || '');
        } catch (error) {
            console.error('Failed to fetch sale', error);
            alert('Could not load sale details.');
            navigate(-1);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchSaleDetails();
    }, [id]);

    const handleMarkPaid = async () => {
        setIsProcessing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: adminData } = await supabase
                .from('users')
                .select('email')
                .eq('id', user!.id)
                .single();

            const { error } = await supabase
                .from('sales')
                .update({
                    status: 'paid',
                    payment_status: 'paid',
                    transaction_id: transactionIdInput || sale?.transaction_id,
                    paid_at: new Date().toISOString(),
                    paid_by: user?.id,
                    paid_by_email: adminData?.email || user?.email,
                })
                .eq('id', id);

            if (error) throw error;

            await logAdminAction(
                ActionFlag.CHANGE,
                `Sale #${id?.substring(0, 8)}`,
                `Marked incentive as paid${transactionIdInput ? ` with transaction ID ${transactionIdInput}` : ''}`
            );

            alert('Sale marked as paid.');
            fetchSaleDetails();
        } catch (error) {
            console.error(error);
            alert('Failed to mark as paid.');
        } finally {
            setIsProcessing(false);
        }
    };

    const copyText = async (text?: string | null) => {
        if (!text || text === 'N/A') return;
        await navigator.clipboard.writeText(text);
        alert('Copied to clipboard');
    };

    if (loading || !sale) {
        return (
            <div className="flex flex-1 justify-center items-center h-full bg-[#f5f5f5]">
                <div className="w-8 h-8 border-4 border-[#1976d2] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const isPending = sale.status === 'pending';
    const isReadyToPay = sale.status === 'approver_approved' && sale.payment_status === 'unpaid';
    const upiAddress = sale.promoter_upi || (sale.promoter_phone && sale.promoter_phone !== 'N/A' ? `${sale.promoter_phone}@okbizaxis` : '');
    const incentiveAmount = parseFloat(sale.incentive_amount || '0').toFixed(2);
    const payeeName = (sale.promoter_name || 'Promoter').substring(0, 20);
    const upiUrl = upiAddress ? `upi://pay?pa=${upiAddress}&pn=${encodeURIComponent(payeeName)}&am=${incentiveAmount}&cu=INR` : '';
    const qrUrl = upiUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}` : '';

    return (
        <div className="flex-1 bg-[#f5f5f5] min-h-full">
            <div className="bg-[#1976d2] pt-[20px] pb-[15px] px-[20px] flex items-center shadow-md">
                <button
                    onClick={() => navigate(-1)}
                    className="mr-[15px] text-white hover:bg-white/10 rounded-full p-1 transition-colors"
                >
                    <ChevronLeft size={28} />
                </button>
                <h1 className="text-[20px] font-bold text-white tracking-wide">Sale Details</h1>
            </div>

            <div className="p-[15px]">
                <div className="bg-white p-[20px] rounded-[8px] shadow-[0_2px_3px_rgba(0,0,0,0.1)] mb-[30px]">
                    <Info label="Promoter" value={sale.promoter_email} />
                    <Info label="Promoter Phone" value={sale.promoter_phone} />

                    <div className="mt-[10px] mb-[20px]">
                        <p className="text-[12px] text-[#2e7d32] mb-[4px]">GPay Number (Tap to Copy)</p>
                        <button
                            type="button"
                            onClick={() => copyText(sale.promoter_gpay)}
                            className="w-full text-left bg-[#e8f5e9] p-[10px] rounded-[10px] border border-[#c8e6c9] flex justify-between items-center"
                        >
                            <span className="text-[16px] font-bold text-[#2e7d32]">{sale.promoter_gpay}</span>
                            <Copy size={16} className="text-[#2e7d32]" />
                        </button>
                    </div>

                    <Info label="Product Name" value={sale.product_name} />
                    {sale.model_no && <Info label="Model Number" value={sale.model_no} />}
                    {sale.serial_no && <Info label="Serial Number" value={sale.serial_no} />}
                    {sale.bill_no && <Info label="Bill Number" value={sale.bill_no} />}
                    <Info label="Bill Amount" value={`₹${sale.bill_amount}`} />
                    <Info label="Date Submitted" value={new Date(sale.created_at).toLocaleDateString()} />

                    <div className="flex flex-row justify-between mb-[15px]">
                        <div>
                            <p className="text-[12px] text-[#888] mb-[4px]">Status</p>
                            <p className={`text-[16px] font-[600] uppercase ${sale.status === 'approver_approved' || sale.status === 'paid' ? 'text-[#4caf50]' : sale.status === 'rejected' ? 'text-[#f44336]' : 'text-[#ff9800]'}`}>
                                {sale.status}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[12px] text-[#888] mb-[4px]">Payment Status</p>
                            <div>
                                <p className="text-[16px] text-[#333] font-[600] uppercase">{sale.payment_status}</p>
                                {sale.payment_status === 'paid' && sale.paid_at && (
                                    <p className="text-[11px] text-[#999] mt-[4px]">
                                        {new Date(sale.paid_at).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {sale.bill_image && (
                        <div className="mt-[10px] items-center border-t border-[#eee] pt-[15px]">
                            <p className="text-[12px] text-[#888] mb-[10px] w-full text-left">Bill Image</p>
                            <button
                                onClick={() => setIsImageModalVisible(true)}
                                className="relative w-full h-[200px] rounded-[8px] overflow-hidden group focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:ring-offset-2"
                            >
                                <img src={sale.bill_image} alt="Bill thumbnail" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <ZoomIn size={32} color="white" />
                                    <span className="text-white font-semibold ml-2">Tap to Enlarge</span>
                                </div>
                            </button>
                        </div>
                    )}

                    {sale.transaction_id && <Info label="Transaction ID" value={sale.transaction_id} />}

                    {isProcessing ? (
                        <div className="flex justify-center mt-[20px] border-t border-[#eee] pt-[20px]">
                            <div className="w-8 h-8 border-4 border-[#1976d2] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <>
                            {isPending && (
                                <div className="mt-[20px] border-t border-[#eee] pt-[20px]">
                                    <p className="text-[12px] text-[#888] mb-[4px]">Waiting for approver review</p>
                                    <p className="text-[16px] text-[#333] font-[600]">
                                        This sale must be approved by an approver before it can be paid.
                                    </p>
                                </div>
                            )}

                            {!isPending && (
                                <div className="mt-[20px] border-t border-[#eee] pt-[20px]">
                                    <p className="text-[12px] text-[#888] mb-[4px]">Incentive Assigned</p>
                                    <p className="text-[16px] text-[#333] font-[600]">{sale.incentive_amount ? `₹${sale.incentive_amount}` : 'None'}</p>
                                </div>
                            )}

                            {isReadyToPay && (
                                <>
                                    <div className="mt-[20px] bg-[#f0f7ff] p-[15px] rounded-[12px] border border-[#d0e3ff]">
                                        <p className="text-[12px] text-[#1976d2] mb-[10px] font-bold">Scan to Pay (UPI)</p>
                                        {qrUrl ? (
                                            <div className="flex flex-col items-center">
                                                <div className="bg-white p-[15px] rounded-[16px] shadow">
                                                    <img src={qrUrl} alt="UPI payment QR" className="w-[200px] h-[200px]" />
                                                </div>
                                                <p className="text-[14px] font-bold text-[#1976d2] mt-[10px]">{upiAddress}</p>
                                                <p className="text-[12px] text-[#666] mt-[2px]">Amount: ₹{incentiveAmount}</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center p-[15px] text-[#f57c00]">
                                                <QrCode size={24} />
                                                <p className="text-[12px] font-bold mt-[5px]">Payment Details Missing</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-[20px]">
                                        <p className="text-[12px] text-[#888] mb-[4px]">Transaction ID (Update if needed)</p>
                                        <input
                                            type="text"
                                            className="w-full border border-[#ccc] rounded-[8px] p-[12px] text-[16px] mb-[15px] bg-[#fafafa] outline-none focus:border-[#1976d2]"
                                            value={transactionIdInput}
                                            onChange={(e) => setTransactionIdInput(e.target.value)}
                                            placeholder="TXN12345678"
                                        />
                                        <button
                                            onClick={handleMarkPaid}
                                            className="w-full bg-[#9c27b0] hover:bg-[#8e24aa] active:bg-[#7b1fa2] text-white font-medium py-[10px] rounded uppercase tracking-wider transition-colors"
                                        >
                                            Mark Incentive as Paid
                                        </button>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            {isImageModalVisible && sale.bill_image && (
                <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
                    <button
                        onClick={() => setIsImageModalVisible(false)}
                        className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-white transition-colors focus:outline-none"
                    >
                        <X size={32} />
                    </button>
                    <img
                        src={sale.bill_image}
                        alt="Enlarged Bill"
                        className="max-w-full max-h-[90vh] object-contain cursor-zoom-out"
                        onClick={() => setIsImageModalVisible(false)}
                    />
                </div>
            )}
        </div>
    );
}

function Info({ label, value }: { label: string; value?: string | null }) {
    return (
        <div className="mb-[15px]">
            <p className="text-[12px] text-[#888] mb-[4px]">{label}</p>
            <p className="text-[16px] text-[#333] font-[600]">{value || 'N/A'}</p>
        </div>
    );
}
