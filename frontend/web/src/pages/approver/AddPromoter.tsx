import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../services/supabase';

export default function ApproverAddPromoter() {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        shopName: '',
        phoneNumber: '',
        gPayNumber: '',
        upiId: '',
        confirmUpiId: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [event.target.name]: event.target.value });
    };

    const resetForm = () => {
        setFormData({
            email: '',
            password: '',
            confirmPassword: '',
            fullName: '',
            shopName: '',
            phoneNumber: '',
            gPayNumber: '',
            upiId: '',
            confirmUpiId: '',
        });
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');

        if (!formData.email.trim() || !formData.password.trim() || !formData.confirmPassword.trim() || !formData.fullName.trim() || !formData.shopName.trim() || !formData.phoneNumber.trim() || !formData.gPayNumber.trim() || !formData.upiId.trim() || !formData.confirmUpiId.trim()) {
            setError('Please fill all fields.');
            return;
        }

        if (formData.password.trim().length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        if (formData.password.trim() !== formData.confirmPassword.trim()) {
            setError('Password and confirm password do not match.');
            return;
        }

        if (formData.upiId.trim().toLowerCase() !== formData.confirmUpiId.trim().toLowerCase()) {
            setError('UPI ID and confirm UPI ID do not match.');
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not signed in.');

            const { error: submitError } = await supabase.from('promoter_requests').insert({
                created_by: user.id,
                approver_id: user.id,
                email: formData.email.trim().toLowerCase(),
                password: formData.password.trim(),
                full_name: formData.fullName.trim(),
                shop_name: formData.shopName.trim(),
                phone_number: formData.phoneNumber.trim(),
                gpay_number: formData.gPayNumber.trim(),
                upi_id: formData.upiId.trim(),
                status: 'pending',
            });

            if (submitError) throw submitError;

            resetForm();
            alert('Request sent successfully.');
        } catch (error: any) {
            const msg = error?.message || 'Could not submit promoter request.';
            if (msg.includes('public.promoter_requests')) {
                setError('Promoter request table is missing in database. Please ask admin to run the latest Supabase migration, then try again.');
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 bg-[#f5f5f5] min-h-full">
            <form onSubmit={handleSubmit} className="p-[16px] flex flex-col">
                <h1 className="text-[24px] font-bold text-[#222] mb-[6px]">Add Promoter Request</h1>
                <p className="text-[14px] text-[#666] mb-[16px]">Submit promoter details for admin approval.</p>

                {error && <div className="bg-[#ffebee] text-[#c62828] p-3 rounded-[10px] text-sm mb-4 font-medium">{error}</div>}
                <Input name="email" value={formData.email} onChange={handleChange} placeholder="Email" type="email" />

                <PasswordInput
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={'give initial password as "password"'}
                    visible={showPassword}
                    onToggle={() => setShowPassword((prev) => !prev)}
                />

                <PasswordInput
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm Password"
                    visible={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword((prev) => !prev)}
                />

                <Input name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Full Name" />
                <Input name="shopName" value={formData.shopName} onChange={handleChange} placeholder="Shop Name / Location" />
                <Input name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="Phone Number" />
                <Input name="gPayNumber" value={formData.gPayNumber} onChange={handleChange} placeholder="GPay Number" />
                <Input name="upiId" value={formData.upiId} onChange={handleChange} placeholder="UPI ID" />
                <Input name="confirmUpiId" value={formData.confirmUpiId} onChange={handleChange} placeholder="Confirm UPI ID" />

                <button
                    type="submit"
                    disabled={loading}
                    className={`mt-[6px] bg-[#1976d2] rounded-[10px] py-[13px] text-white font-bold text-[16px] ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                    {loading ? 'Sending...' : 'Send for Approval'}
                </button>
            </form>
        </div>
    );
}

function Input({ name, value, onChange, placeholder, type = 'text' }: {
    name: string;
    value: string;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
    type?: string;
}) {
    return (
        <input
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="bg-white border border-[#e2e8f0] rounded-[10px] px-[12px] py-[12px] mb-[12px] text-[15px] outline-none focus:border-[#1976d2]"
        />
    );
}

function PasswordInput({ name, value, onChange, placeholder, visible, onToggle }: {
    name: string;
    value: string;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
    visible: boolean;
    onToggle: () => void;
}) {
    const Icon = visible ? EyeOff : Eye;

    return (
        <div className="relative mb-[12px]">
            <input
                name={name}
                type={visible ? 'text' : 'password'}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full bg-white border border-[#e2e8f0] rounded-[10px] px-[12px] py-[12px] pr-[50px] text-[15px] outline-none focus:border-[#1976d2]"
            />
            <button
                type="button"
                onClick={onToggle}
                className="absolute right-[12px] top-[10px] p-1 text-[#1976d2]"
            >
                <Icon size={20} />
            </button>
        </div>
    );
}
