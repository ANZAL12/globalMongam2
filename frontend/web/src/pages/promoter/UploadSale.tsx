import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function PromoterUploadSale() {
    const navigate = useNavigate();
    const [productName, setProductName] = useState('');
    const [modelNo, setModelNo] = useState('');
    const [serialNo, setSerialNo] = useState('');
    const [billNo, setBillNo] = useState('');
    const [billAmount, setBillAmount] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Use an invisible file input triggered by buttons
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const triggerFileInput = () => {
        if (fileInputRef.current) {
            // Reset to allow selecting the same file again if needed
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const triggerCamera = () => {
        if (fileInputRef.current) {
            // In a web environment, we can hint we want the camera via capture="environment"
            // We temporarily add the attribute, click, then remove it so standard file picker works next time.
            fileInputRef.current.setAttribute('capture', 'environment');
            fileInputRef.current.click();

            // Need a slight delay to remove it so the click registers it first
            setTimeout(() => {
                if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute('capture');
                }
            }, 100);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!productName || !modelNo || !serialNo || !billNo || !billAmount || !imageFile) {
            alert('Please fill in all mandatory fields (*) and select an image.');
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('product_name', productName);
            formData.append('model_no', modelNo);
            formData.append('serial_no', serialNo);
            formData.append('bill_no', billNo);
            formData.append('bill_amount', billAmount);
            formData.append('bill_image', imageFile);

            await api.post('/sales/create/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            alert('Sale uploaded successfully!');
            setProductName('');
            setModelNo('');
            setSerialNo('');
            setBillNo('');
            setBillAmount('');
            setImageFile(null);
            setImagePreview(null);
            navigate('/promoter');
        } catch (error: any) {
            console.error('Upload failed', error);

            let alertTitle = "Submission Error";
            let errorMessage = "We encountered a problem while uploading your sale. Please try again.";

            if (error.response && error.response.data) {
                const data = error.response.data;
                if (data.bill_no) {
                    const billError = data.bill_no.join(' ').toLowerCase();
                    if (billError.includes('already exists')) {
                        alertTitle = "Duplicate Bill";
                        errorMessage = "This bill number has already been used. Please check the number.";
                    } else {
                        errorMessage = data.bill_no.join(' ');
                    }
                } else if (data.detail) {
                    errorMessage = data.detail;
                }
            } else if (!error.response) {
                alertTitle = "Connection Error";
                errorMessage = "Could not connect to the server. Please check your internet connection.";
            }

            alert(`${alertTitle}: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-1 bg-white min-h-[calc(100vh-130px)] pb-[80px]">
            <form onSubmit={handleSubmit} className="p-[20px] flex flex-col">

                <label className="text-[16px] font-[600] mb-[8px] text-[#333]">Product Name *</label>
                <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. Samsung S23"
                    className="border border-[#ccc] rounded-[8px] p-[12px] text-[16px] mb-[20px] bg-[#fafafa] outline-none focus:border-[#1976d2] transition-colors"
                />

                <label className="text-[16px] font-[600] mb-[8px] text-[#333]">Model No *</label>
                <input
                    type="text"
                    value={modelNo}
                    onChange={(e) => setModelNo(e.target.value)}
                    placeholder="e.g. SM-S911B"
                    className="border border-[#ccc] rounded-[8px] p-[12px] text-[16px] mb-[20px] bg-[#fafafa] outline-none focus:border-[#1976d2] transition-colors"
                />

                <label className="text-[16px] font-[600] mb-[8px] text-[#333]">Serial No *</label>
                <input
                    type="text"
                    value={serialNo}
                    onChange={(e) => setSerialNo(e.target.value)}
                    placeholder="e.g. RZ8T123456"
                    className="border border-[#ccc] rounded-[8px] p-[12px] text-[16px] mb-[20px] bg-[#fafafa] outline-none focus:border-[#1976d2] transition-colors"
                />

                <label className="text-[16px] font-[600] mb-[8px] text-[#333]">Bill No *</label>
                <input
                    type="text"
                    value={billNo}
                    onChange={(e) => setBillNo(e.target.value)}
                    placeholder="e.g. INV-12345"
                    className="border border-[#ccc] rounded-[8px] p-[12px] text-[16px] mb-[20px] bg-[#fafafa] outline-none focus:border-[#1976d2] transition-colors"
                />

                <label className="text-[16px] font-[600] mb-[8px] text-[#333]">Bill Amount *</label>
                <input
                    type="number"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    className="border border-[#ccc] rounded-[8px] p-[12px] text-[16px] mb-[20px] bg-[#fafafa] outline-none focus:border-[#1976d2] transition-colors"
                />

                <label className="text-[16px] font-[600] mb-[8px] text-[#333]">Bill Image *</label>
                <div className="flex flex-col items-center mb-[30px]">
                    {imagePreview ? (
                        <img
                            src={imagePreview}
                            alt="Bill preview"
                            className="w-[200px] h-[200px] rounded-[8px] mb-[10px] object-cover"
                        />
                    ) : (
                        <div className="w-[200px] h-[200px] border border-[#ccc] border-dashed rounded-[8px] flex justify-center items-center mb-[10px] bg-[#fafafa]">
                            <span className="text-[#888]">No image selected</span>
                        </div>
                    )}

                    {/* Hidden file input */}
                    <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    <div className="flex flex-row justify-center w-full gap-[20px] mt-[10px]">
                        <button
                            type="button"
                            onClick={triggerFileInput}
                            className="bg-transparent border-none text-[#1976d2] font-[500] uppercase tracking-wide hover:bg-blue-50 px-[15px] py-[8px] rounded transition-colors"
                        >
                            CHOOSE IMAGE
                        </button>
                        <button
                            type="button"
                            onClick={triggerCamera}
                            className="bg-transparent border-none text-[#1976d2] font-[500] uppercase tracking-wide hover:bg-blue-50 px-[15px] py-[8px] rounded transition-colors"
                        >
                            TAKE PHOTO
                        </button>
                    </div>
                </div>

                <div className="mt-[10px]">
                    {isSubmitting ? (
                        <div className="flex justify-center">
                            <div className="w-8 h-8 border-4 border-[#1976d2] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <button
                            type="submit"
                            className="w-full bg-[#4caf50] hover:bg-[#43a047] active:bg-[#388e3c] text-white font-[500] py-[10px] rounded-[4px] uppercase tracking-wider transition-colors shadow-sm"
                        >
                            Submit Sale
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
