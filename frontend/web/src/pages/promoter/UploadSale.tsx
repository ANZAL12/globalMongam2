import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { ScanBarcode, X, Image as ImageIcon } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

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
    const [isScanning, setIsScanning] = useState(false);
    const [isProcessingGalleryImage, setIsProcessingGalleryImage] = useState(false);
    const [scannerError, setScannerError] = useState<string | null>(null);
    const galleryFileInputRef = useRef<HTMLInputElement>(null);

    const handleGalleryBarcodeScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];
        setIsProcessingGalleryImage(true);
        try {
            const html5QrCode = new Html5Qrcode("web-barcode-reader-file-temp");
            const decodedText = await html5QrCode.scanFile(file, false);
            if (decodedText) {
                try {
                    if ('vibrate' in navigator) navigator.vibrate(150);
                } catch (err) {}
                setSerialNo(decodedText.trim());
                setIsScanning(false);
            }
        } catch (err) {
            alert("No barcode detected in the selected image. Please choose a clearer picture or scan using the camera.");
        } finally {
            setIsProcessingGalleryImage(false);
            if (galleryFileInputRef.current) {
                galleryFileInputRef.current.value = '';
            }
        }
    };

    useEffect(() => {
        if (!isScanning) return;

        let html5QrCode: Html5Qrcode | null = null;
        let isMounted = true;

        const startScanner = async () => {
            try {
                setScannerError(null);
                html5QrCode = new Html5Qrcode("web-barcode-reader");
                await html5QrCode.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 280, height: 160 },
                        aspectRatio: 1.0,
                    },
                    (decodedText) => {
                        if (decodedText && isMounted) {
                            try {
                                if ('vibrate' in navigator) {
                                    navigator.vibrate(150);
                                }
                            } catch (e) {}
                            setSerialNo(decodedText.trim());
                            if (html5QrCode?.isScanning) {
                                html5QrCode.stop().then(() => {
                                    html5QrCode?.clear();
                                    if (isMounted) setIsScanning(false);
                                }).catch(() => {
                                    if (isMounted) setIsScanning(false);
                                });
                            } else {
                                if (isMounted) setIsScanning(false);
                            }
                        }
                    },
                    () => {}
                );
            } catch (err: any) {
                console.error("Barcode scanner initialization error:", err);
                if (isMounted) {
                    setScannerError(err?.message || "Could not access camera. Please allow camera permissions in your browser.");
                }
            }
        };

        const timer = setTimeout(startScanner, 150);

        return () => {
            isMounted = false;
            clearTimeout(timer);
            if (html5QrCode?.isScanning) {
                html5QrCode.stop().then(() => {
                    html5QrCode?.clear();
                }).catch(console.error);
            }
        };
    }, [isScanning]);

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

            if (insertError) {
                if (insertError.code === '23505') {
                    throw new Error('This bill number has already been used. Please check the number.');
                }
                throw insertError;
            }

            alert('Sale uploaded successfully!');
            setProductName('');
            setModelNo('');
            setSerialNo('');
            setBillNo('');
            setBillAmount('');
            setImageFile(null);
            setImagePreview(null);
            navigate('/promoter/sales');
        } catch (error: any) {
            console.error('Upload failed', error);
            const title = error.message?.includes('already used') || error.message?.includes('already exists')
                ? 'Duplicate Bill'
                : 'Submission Error';
            alert(`${title}: ${error.message || "We encountered a problem while uploading your sale."}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-1 bg-white min-h-full">
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

                <div className="flex items-center justify-between mb-[8px]">
                    <label className="text-[16px] font-[600] text-[#333]">Serial No *</label>
                    <button
                        type="button"
                        onClick={() => setIsScanning(true)}
                        className="flex items-center gap-1.5 text-[14px] font-[500] text-[#1976d2] hover:text-[#115293] cursor-pointer"
                        title="Scan barcode with camera"
                    >
                        <ScanBarcode className="w-4 h-4" />
                        <span>Scan Barcode</span>
                    </button>
                </div>
                <div className="relative mb-[20px]">
                    <input
                        type="text"
                        value={serialNo}
                        onChange={(e) => setSerialNo(e.target.value)}
                        placeholder="e.g. RZ8T123456"
                        className="w-full border border-[#ccc] rounded-[8px] p-[12px] pr-[44px] text-[16px] bg-[#fafafa] outline-none focus:border-[#1976d2] transition-colors"
                    />
                    <button
                        type="button"
                        onClick={() => setIsScanning(true)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#1976d2] hover:text-[#115293] p-2 cursor-pointer transition-colors"
                        title="Scan barcode"
                    >
                        <ScanBarcode className="w-5 h-5" />
                    </button>
                </div>

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
                            className="w-[200px] h-[200px] object-cover rounded-[8px] mb-[10px]"
                        />
                    ) : (
                        <div className="w-[200px] h-[200px] border border-[#ccc] border-dashed rounded-[8px] flex items-center justify-center mb-[10px]">
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

                    <div className="flex justify-center w-full gap-[20px]">
                        <button
                            type="button"
                            onClick={triggerFileInput}
                            className="bg-[#2196f3] hover:bg-[#1e88e5] active:bg-[#1976d2] text-white font-[500] px-[16px] py-[8px] rounded-[4px] uppercase text-[14px] transition-colors shadow-sm cursor-pointer"
                        >
                            CHOOSE IMAGE
                        </button>
                        <button
                            type="button"
                            onClick={triggerCamera}
                            className="bg-[#1976d2] hover:bg-[#1565c0] active:bg-[#0d47a1] text-white font-[500] px-[16px] py-[8px] rounded-[4px] uppercase text-[14px] transition-colors shadow-sm cursor-pointer"
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

            {/* Barcode Scanner Modal for Web */}
            {isScanning && (
                <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl relative flex flex-col items-center">
                        <div className="w-full flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2 text-gray-800">
                                <ScanBarcode className="w-5 h-5 text-[#1976d2]" />
                                <h3 className="font-semibold text-lg">Scan Serial Barcode</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => galleryFileInputRef.current?.click()}
                                    disabled={isProcessingGalleryImage}
                                    className="p-1.5 text-gray-600 hover:text-[#1976d2] rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1 text-xs font-medium cursor-pointer"
                                    title="Upload barcode image from gallery"
                                >
                                    <ImageIcon className="w-4 h-4" />
                                    <span>Gallery</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsScanning(false)}
                                    className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {scannerError ? (
                            <div className="w-full p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4 text-center">
                                <p className="font-semibold mb-1">Camera Error</p>
                                <p>{scannerError}</p>
                            </div>
                        ) : (
                            <div className="w-full flex flex-col items-center">
                                <div
                                    id="web-barcode-reader"
                                    className="w-full max-w-[340px] aspect-square rounded-lg overflow-hidden bg-black shadow-inner"
                                />
                                <p className="text-xs text-gray-500 mt-3 text-center">
                                    Point your camera at the barcode or QR code, or upload an image from your gallery.
                                </p>
                            </div>
                        )}

                        <input
                            type="file"
                            accept="image/*"
                            ref={galleryFileInputRef}
                            onChange={handleGalleryBarcodeScan}
                            className="hidden"
                        />
                        <div id="web-barcode-reader-file-temp" className="hidden" />

                        <button
                            type="button"
                            onClick={() => galleryFileInputRef.current?.click()}
                            disabled={isProcessingGalleryImage}
                            className="mt-4 w-full py-2.5 px-4 rounded-lg border border-gray-200 hover:border-[#1976d2] hover:bg-blue-50/50 text-[#1976d2] font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                            <ImageIcon className="w-4 h-4" />
                            <span>{isProcessingGalleryImage ? "Scanning image..." : "Upload from Gallery"}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsScanning(false)}
                            className="mt-2.5 w-full py-2.5 px-4 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
