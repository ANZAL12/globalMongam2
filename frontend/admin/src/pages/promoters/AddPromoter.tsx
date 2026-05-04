import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logActivity } from '../../utils/logger';
import { 
  UserPlus, 
  ArrowLeft, 
  Mail, 
  Lock, 
  Store, 
  User, 
  Phone, 
  CreditCard,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export function AddPromoter() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gPayNumber, setGPayNumber] = useState('');
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!email.trim() || !password.trim() || !shopName.trim() || !fullName.trim() || !phoneNumber.trim() || !gPayNumber.trim() || !upiId.trim()) {
      setError('Please fill in all required fields marked with *');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      // Use Electron IPC to call the Supabase Admin API (handles password hashing correctly)
      const result = await (window as any).electron.supabase.createPromoter({
        email: email.trim().toLowerCase(),
        password: password.trim(),
        full_name: fullName.trim(),
        shop_name: shopName.trim(),
        phone_number: phoneNumber.trim(),
        gpay_number: gPayNumber.trim(),
        upi_id: upiId.trim()
      });

      if (!result.success) throw new Error(result.error);

      await logActivity('Register Promoter', `Created account for ${fullName} (${email}) at ${shopName}`);

      setSuccess(true);
      setTimeout(() => navigate('/promoters'), 2000);
    } catch (err: any) {
      console.error('Error creating promoter:', err);
      setError(err.message || 'Failed to create promoter account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/promoters')}
          className="p-2 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all hover:shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Add New Promoter</h1>
          <p className="mt-1 text-sm text-gray-500">Create a new account for a promoter to start tracking sales.</p>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden p-6 md:p-8">
        {success ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Account Created!</h2>
            <p className="text-gray-500">The promoter account has been successfully created. Redirecting you back...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center space-x-3 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 animate-in slide-in-from-top-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-gray-400" />
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                  placeholder="promoter@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 flex items-center">
                  <Lock className="h-4 w-4 mr-2 text-gray-400" />
                  Initial Password *
                </label>
                <input
                  type="password"
                  required
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 flex items-center">
                  <User className="h-4 w-4 mr-2 text-gray-400" />
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 flex items-center">
                  <Store className="h-4 w-4 mr-2 text-gray-400" />
                  Shop Name / Location *
                </label>
                <input
                  type="text"
                  required
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                  placeholder="Electronics Emporium"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-gray-400" />
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                  placeholder="+91 88888 88888"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 flex items-center">
                  <CreditCard className="h-4 w-4 mr-2 text-gray-400" />
                  GPay Number *
                </label>
                <input
                  type="tel"
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                  placeholder="+91 88888 88888"
                  value={gPayNumber}
                  onChange={(e) => setGPayNumber(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 flex items-center">
                  <CreditCard className="h-4 w-4 mr-2 text-gray-400" />
                  UPI ID *
                </label>
                <input
                  type="text"
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                  placeholder="username@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/promoters')}
                className="px-6 py-3 border border-gray-200 text-sm font-bold text-gray-600 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-8 py-3 border border-transparent shadow-sm text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all active:scale-95"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                    Register Promoter
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
