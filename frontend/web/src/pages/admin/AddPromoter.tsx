import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../../services/api';

export default function AdminAddPromoter() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        shop_name: '',
        phone_number: '',
        gpay_number: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.email || !formData.password || !formData.full_name || !formData.shop_name) {
            setError('Please fill in all required fields.');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/admin/promoters/create/', formData);
            navigate('/admin/promoters');
        } catch (err: any) {
            console.error('Error creating promoter:', err);
            setError(err.response?.data?.error || 'Failed to create promoter.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 bg-[#f5f5f5] min-h-[calc(100vh-130px)] pb-[80px]">
            <div className="bg-white p-[20px] m-[15px] rounded-[8px] shadow-[0_2px_3px_rgba(0,0,0,0.1)]">
                <div className="flex items-center mb-[20px] pb-[10px] border-b border-[#eee]">
                    <button
                        onClick={() => navigate('/admin/promoters')}
                        className="mr-[15px] p-[5px] rounded-full hover:bg-[#f0f0f0] transition-colors"
                    >
                        <ArrowLeft size={24} className="text-[#333]" />
                    </button>
                    <h2 className="text-[20px] font-bold text-[#333]">Add New Promoter</h2>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col">
                    {error && (
                        <div className="bg-[#ffebee] text-[#c62828] p-3 rounded-[8px] text-sm mb-4 font-medium">
                            {error}
                        </div>
                    )}

                    <label className="text-[16px] font-[600] mb-[8px] text-[#333]">Full Name *</label>
                    <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        placeholder="e.g. John Doe"
                        className="border border-[#ccc] rounded-[8px] p-[12px] text-[16px] mb-[20px] bg-[#fafafa] outline-none focus:border-[#1976d2]"
                    />

                    <label className="text-[16px] font-[600] mb-[8px] text-[#333]">Email *</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="e.g. john@example.com"
                        className="border border-[#ccc] rounded-[8px] p-[12px] text-[16px] mb-[20px] bg-[#fafafa] outline-none focus:border-[#1976d2]"
                    />

                    <label className="text-[16px] font-[600] mb-[8px] text-[#333]">Password *</label>
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Create a secure password"
                        className="border border-[#ccc] rounded-[8px] p-[12px] text-[16px] mb-[20px] bg-[#fafafa] outline-none focus:border-[#1976d2]"
                    />

                    <label className="text-[16px] font-[600] mb-[8px] text-[#333]">Shop Name *</label>
                    <input
                        type="text"
                        name="shop_name"
                        value={formData.shop_name}
                        onChange={handleChange}
                        placeholder="e.g. Electronics Hub"
                        className="border border-[#ccc] rounded-[8px] p-[12px] text-[16px] mb-[20px] bg-[#fafafa] outline-none focus:border-[#1976d2]"
                    />

                    <label className="text-[16px] font-[600] mb-[8px] text-[#333]">Phone Number (Optional)</label>
                    <input
                        type="text"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleChange}
                        placeholder="e.g. +1234567890"
                        className="border border-[#ccc] rounded-[8px] p-[12px] text-[16px] mb-[20px] bg-[#fafafa] outline-none focus:border-[#1976d2]"
                    />

                    <label className="text-[16px] font-[600] mb-[8px] text-[#333]">GPay Number (Optional)</label>
                    <input
                        type="text"
                        name="gpay_number"
                        value={formData.gpay_number}
                        onChange={handleChange}
                        placeholder="e.g. +1234567890"
                        className="border border-[#ccc] rounded-[8px] p-[12px] text-[16px] mb-[30px] bg-[#fafafa] outline-none focus:border-[#1976d2]"
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full bg-[#1976d2] rounded-[4px] p-[12px] flex items-center justify-center uppercase tracking-wider font-[600] text-white transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                    >
                        {loading ? 'Adding...' : 'Add Promoter'}
                    </button>
                </form>
            </div>
        </div>
    );
}
