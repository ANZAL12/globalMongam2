import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, X, ZoomIn } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { logAdminAction, ActionFlag } from '../../services/logger';

type SaleDetail = {
    id: string; // UUID in supabase
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
};

export default function AdminSaleDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [sale, setSale] = useState<SaleDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [incentiveInput, setIncentiveInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isImageModalVisible, setIsImageModalVisible] = useState(false);

    const fetchSaleDetails = async () => {
        try {
            const { data, error } = await supabase
                .from('sales')
                .select('*, promoter:users!sales_promoter_id_fkey(email)')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (data) {
                const formattedSale = {
                    ...data,
                    promoter_email: data.promoter?.email || 'Unknown',
                    bill_image: data.bill_image_url
                };
                setSale(formattedSale as SaleDetail);
                setIncentiveInput(formattedSale.incentive_amount || '');
            } else {
                alert('Sale not found.');
                navigate(-1);
            }
        } catch (error) {
            console.error('Failed to fetch sale', error);
            alert('Sale not found.');
            navigate(-1);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchSaleDetails();
    }, [id]);

    const handleApprove = async () => {
        if (!incentiveInput || isNaN(parseFloat(incentiveInput))) {
            alert('Please enter a valid incentive amount.');
            return;
        }

        setIsProcessing(true);
        try {
            const { error } = await supabase
                .from('sales')
                .update({ status: 'approved', incentive_amount: parseFloat(incentiveInput) })
                .eq('id', id);

            if (error) throw error;
            
            // Log the action
            await logAdminAction(
                ActionFlag.CHANGE, 
                `Sale #${id?.substring(0, 8)}`, 
                `Approved with incentive: ₹${incentiveInput}`
            );

            alert('Sale has been approved.');
            fetchSaleDetails();
        } catch (error) {
            console.error(error);
            alert('Failed to approve sale.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (window.confirm("Are you sure you want to reject this sale?")) {
            setIsProcessing(true);
            try {
                const { error } = await supabase
                    .from('sales')
                    .update({ status: 'rejected' })
                    .eq('id', id);

                if (error) throw error;

                // Log the action
                await logAdminAction(
                    ActionFlag.CHANGE, 
                    `Sale #${id?.substring(0, 8)}`, 
                    `Rejected sale`
                );

                alert('Sale has been rejected.');
                fetchSaleDetails();
            } catch (error) {
                console.error(error);
                alert('Failed to reject sale.');
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const handleMarkPaid = async () => {
        setIsProcessing(true);
        try {
            const { error } = await supabase
                .from('sales')
                .update({ payment_status: 'paid' })
                .eq('id', id);

            if (error) throw error;

            // Log the action
            await logAdminAction(
                ActionFlag.CHANGE, 
                `Sale #${id?.substring(0, 8)}`, 
                `Marked incentive as paid`
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

    if (loading || !sale) {
        return (
            <div className="flex flex-1 justify-center items-center h-full bg-[#f5f5f5]">
                <div className="w-8 h-8 border-4 border-[#1976d2] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const isPending = sale.status === 'pending';
    const isApprovedUnpaid = sale.status === 'approved' && sale.payment_status === 'unpaid';

    return (
        <div className="flex-1 bg-[#f5f5f5] min-h-[calc(100vh-130px)] pb-[80px]">
            {/* Custom Header for detail view */}
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
                    <div className="mb-[15px]">
                        <p className="text-[12px] text-[#888] mb-[4px]">Promoter</p>
                        <p className="text-[16px] text-[#333] font-[600]">{sale.promoter_email}</p>
                    </div>

                    <div className="mb-[15px]">
                        <p className="text-[12px] text-[#888] mb-[4px]">Product Name</p>
                        <p className="text-[16px] text-[#333] font-[600]">{sale.product_name}</p>
                    </div>

                    {sale.model_no && (
                        <div className="mb-[15px]">
                            <p className="text-[12px] text-[#888] mb-[4px]">Model Number</p>
                            <p className="text-[16px] text-[#333] font-[600]">{sale.model_no}</p>
                        </div>
                    )}

                    {sale.serial_no && (
                        <div className="mb-[15px]">
                            <p className="text-[12px] text-[#888] mb-[4px]">Serial Number</p>
                            <p className="text-[16px] text-[#333] font-[600]">{sale.serial_no}</p>
                        </div>
                    )}

                    {sale.bill_no && (
                        <div className="mb-[15px]">
                            <p className="text-[12px] text-[#888] mb-[4px]">Bill Number</p>
                            <p className="text-[16px] text-[#333] font-[600]">{sale.bill_no}</p>
                        </div>
                    )}

                    <div className="mb-[15px]">
                        <p className="text-[12px] text-[#888] mb-[4px]">Bill Amount</p>
                        <p className="text-[16px] text-[#333] font-[600]">₹{sale.bill_amount}</p>
                    </div>

                    <div className="mb-[15px]">
                        <p className="text-[12px] text-[#888] mb-[4px]">Date Submitted</p>
                        <p className="text-[16px] text-[#333] font-[600]">{new Date(sale.created_at).toLocaleDateString()}</p>
                    </div>

                    <div className="flex flex-row justify-between mb-[15px]">
                        <div>
                            <p className="text-[12px] text-[#888] mb-[4px]">Status</p>
                            <p className={`text-[16px] font-[600] uppercase ${sale.status === 'approved' ? 'text-[#4caf50]' : sale.status === 'rejected' ? 'text-[#f44336]' : 'text-[#ff9800]'}`}>
                                {sale.status}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[12px] text-[#888] mb-[4px]">Payment Status</p>
                            <p className="text-[16px] text-[#333] font-[600] uppercase">{sale.payment_status}</p>
                        </div>
                    </div>

                    {sale.bill_image && (
                        <div className="mt-[10px] items-center border-t border-[#eee] pt-[15px]">
                            <p className="text-[12px] text-[#888] mb-[10px] w-full text-left">Bill Image</p>
                            <button
                                onClick={() => setIsImageModalVisible(true)}
                                className="relative w-full h-[200px] rounded-[8px] overflow-hidden group focus:outline-none focus:ring-2 focus:ring-[#1976d2] focus:ring-offset-2"
                            >
                                <img
                                    src={`http://127.0.0.1:8000${sale.bill_image}`}
                                    alt="Bill thumbnail"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <ZoomIn size={32} color="white" className="mb-1" />
                                    <span className="text-white font-semibold ml-2">Tap to Enlarge</span>
                                </div>
                            </button>
                        </div>
                    )}

                    {isProcessing ? (
                        <div className="flex justify-center mt-[20px] border-t border-[#eee] pt-[20px]">
                            <div className="w-8 h-8 border-4 border-[#1976d2] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <>
                            {isPending && (
                                <div className="mt-[20px] border-t border-[#eee] pt-[20px]">
                                    <p className="text-[12px] text-[#888] mb-[4px]">Assign Incentive Amount (₹)</p>
                                    <input
                                        type="number"
                                        className="w-full border border-[#ccc] rounded-[8px] p-[12px] text-[16px] mb-[15px] bg-[#fafafa] outline-none focus:border-[#1976d2]"
                                        value={incentiveInput}
                                        onChange={(e) => setIncentiveInput(e.target.value)}
                                        placeholder="10.00"
                                    />
                                    <div className="flex flex-row justify-between gap-[10px]">
                                        <button
                                            onClick={handleApprove}
                                            className="flex-1 bg-[#4caf50] hover:bg-[#43a047] active:bg-[#388e3c] text-white font-medium py-[10px] rounded uppercase tracking-wider transition-colors"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={handleReject}
                                            className="flex-1 bg-[#f44336] hover:bg-[#e53935] active:bg-[#d32f2f] text-white font-medium py-[10px] rounded uppercase tracking-wider transition-colors"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            )}

                            {!isPending && (
                                <div className="mt-[20px] border-t border-[#eee] pt-[20px]">
                                    <p className="text-[12px] text-[#888] mb-[4px]">Incentive Assigned</p>
                                    <p className="text-[16px] text-[#333] font-[600]">{sale.incentive_amount ? `₹${sale.incentive_amount}` : "None"}</p>
                                </div>
                            )}

                            {isApprovedUnpaid && (
                                <div className="mt-[20px]">
                                    <button
                                        onClick={handleMarkPaid}
                                        className="w-full bg-[#9c27b0] hover:bg-[#8e24aa] active:bg-[#7b1fa2] text-white font-medium py-[10px] rounded uppercase tracking-wider transition-colors"
                                    >
                                        Mark Incentive as Paid
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Enlarge Image Modal Overlay */}
            {isImageModalVisible && sale?.bill_image && (
                <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
                    <button
                        onClick={() => setIsImageModalVisible(false)}
                        className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-white transition-colors focus:outline-none"
                    >
                        <X size={32} />
                    </button>
                    <img
                        src={`http://127.0.0.1:8000${sale.bill_image}`}
                        alt="Enlarged Bill"
                        className="max-w-full max-h-[90vh] object-contain cursor-zoom-out"
                        onClick={() => setIsImageModalVisible(false)}
                    />
                </div>
            )}
        </div>
    );
}
