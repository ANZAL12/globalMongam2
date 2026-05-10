import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useModal } from '../context/ModalContext';
import { logActivity } from '../utils/logger';
import { 
  Key, 
  Search, 
  Mail, 
  User, 
  Shield, 
  Send, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';

type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'promoter' | 'approver' | 'admin';
  is_active: boolean;
};

export function ResetPassword() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [siteUrl, setSiteUrl] = useState('https://zefsyngtxzqhjnylzlcg.supabase.co/functions/v1/auth-reset');
  const { showAlert, showConfirm } = useModal();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role, is_active')
        .order('role', { ascending: true })
        .order('email', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (user: UserProfile) => {
    const confirmed = await showConfirm({
      title: 'Reset Password?',
      message: `Send a password reset email to ${user.email}? This will allow the user to set a new password.`,
      severity: 'warning'
    });

    if (!confirmed) return;

    setProcessing(user.id);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: siteUrl,
      });

      if (error) throw error;

      await logActivity('Reset Password', `Admin sent password reset email to ${user.role}: ${user.email}`);

      showAlert({
        title: 'Email Sent',
        message: `A password reset link has been sent to ${user.email}.`,
        severity: 'success'
      });
    } catch (err: any) {
      console.error('Error resetting password:', err);
      showAlert({
        title: 'Reset Failed',
        message: err.message || 'Failed to send reset email.',
        severity: 'error'
      });
    } finally {
      setProcessing(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Account Recovery</h1>
          <p className="mt-1 text-sm text-gray-500 font-medium italic">Send secure password reset links to Promoters and Approvers.</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50 bg-gray-50/30 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                <Shield className="h-3 w-3 mr-1.5" />
                Recovery Page URL (Supabase Edge Function)
              </label>
            </div>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-gray-100 rounded-lg">
                <Send className="h-3.5 w-3.5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="https://your-project.supabase.co/functions/v1/auth-reset"
                className="w-full pl-14 pr-4 py-3 rounded-xl bg-white border border-gray-100 focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-500 transition-all outline-none font-medium text-sm text-gray-600"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
              />
            </div>
            <p className="text-[10px] text-gray-400 font-medium italic pl-1">
              This URL will be sent in the email. We've pre-filled it with your standalone Supabase Edge Function.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
            <input
              type="text"
              placeholder="Search by name or email address..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-100 focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-500 transition-all outline-none font-black text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Accounts...</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredUsers.map((user) => (
                <div key={user.id} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border ${
                      user.role === 'admin' 
                        ? 'bg-rose-50 border-rose-100 text-rose-600' 
                        : user.role === 'approver'
                          ? 'bg-amber-50 border-amber-100 text-amber-600'
                          : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                    }`}>
                      {user.role === 'admin' ? <Shield className="h-6 w-6" /> : <User className="h-6 w-6" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-black text-gray-900">{user.full_name || 'System User'}</span>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-rose-100 text-rose-700' 
                            : user.role === 'approver'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {user.role}
                        </span>
                      </div>
                      <div className="flex items-center text-xs text-gray-500 mt-1 font-medium italic">
                        <Mail className="h-3 w-3 mr-1.5 opacity-40" />
                        {user.email}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleResetPassword(user)}
                    disabled={!!processing || user.role === 'admin'}
                    className={`inline-flex items-center px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                      user.role === 'admin'
                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                        : 'bg-white border border-gray-100 text-gray-900 shadow-sm hover:border-indigo-500 hover:text-indigo-600 active:scale-95'
                    }`}
                  >
                    {processing === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Key className="h-4 w-4 mr-2" />
                    )}
                    Send Reset Link
                  </button>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="py-20 text-center">
                  <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gray-50 mb-4">
                    <AlertCircle className="h-8 w-8 text-gray-200" />
                  </div>
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No users found matching your search</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 flex items-start space-x-4">
        <div className="p-2 bg-white rounded-xl shadow-sm">
          <Key className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Security & Rate Limits</h4>
          <p className="mt-1 text-xs text-amber-800 font-medium leading-relaxed">
            Due to standard security policies on our current infrastructure, password recovery is limited to **2 requests per hour** per user. 
            If you encounter a rate-limit error, please wait 60 minutes before attempting to send another reset link to the same account.
            The link sent via email will expire after 24 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
