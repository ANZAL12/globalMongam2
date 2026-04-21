import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';

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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Verify account is not blocked
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('is_active')
                .eq('id', user.id)
                .single();

            if (userError) throw new Error("Failed to verify account status.");
            if (userData && userData.is_active === false) {
                alert("Action Blocked: Your account is blocked. Please contact the admin.");
                setIsSubmitting(false);
                return;
            }

            // Upload to Cloudinary
            const formData = new FormData();
            formData.append('file', imageFile);
            formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default');
            formData.append('cloud_name', import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dy8s5kclm');

            const response = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dy8s5kclm'}/image/upload`, {
                method: 'POST',
                body: formData,
            });

            const uploadData = await response.json();
            if (uploadData.error) throw new Error(uploadData.error.message);

            const uploadedImageUrl = uploadData.secure_url;

            // Insert into Database
            const { error: insertError } = await supabase.from('sales').insert([{
                promoter_id: user.id,
                product_name: productName,
                model_no: modelNo,
                serial_no: serialNo,
                bill_no: billNo,
                bill_amount: parseFloat(billAmount),
                bill_image_url: uploadedImageUrl,
                status: 'pending',
                payment_status: 'unpaid'
            }]);

            if (insertError) throw insertError;

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
            alert(`Submission Error: ${error.message || "We encountered a problem while uploading your sale."}`);
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
