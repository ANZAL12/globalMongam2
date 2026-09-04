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
  const [confirmingUser, setConfirmingUser] = useState<UserProfile | null>(null);
  const [confirmEmailInput, setConfirmEmailInput] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const { showAlert } = useModal();

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

  const handleResetPassword = (user: UserProfile) => {
    setConfirmingUser(user);
    setConfirmEmailInput('');
    setConfirmError('');
  };

  const processRecovery = async () => {
    if (!confirmingUser) return;
    
    if (confirmEmailInput !== confirmingUser.email) {
      setConfirmError('The email entered does not match.');
      return;
    }

    const userToProcess = confirmingUser;
    setConfirmingUser(null);
    setProcessing(userToProcess.id);

    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ must_change_password: true })
        .eq('id', userToProcess.id);

      if (updateError) throw updateError;

      await logActivity('Account Recovery', `Admin triggered account recovery for ${userToProcess.role}: ${userToProcess.email}`);

      showAlert({
        title: 'Recovery Triggered',
        message: `Account recovery has been initiated for ${userToProcess.email}.`,
        severity: 'success'
      });
    } catch (err: any) {
      console.error('Error resetting password:', err);
      showAlert({
        title: 'Reset Failed',
        message: err.message || 'Failed to trigger account recovery.',
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
    <div className="w-full space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Account Recovery</h1>
          <p className="mt-1 text-sm text-gray-500 font-medium italic">Trigger password recovery for Promoters and Approvers.</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50 bg-gray-50/30 space-y-6">
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
                    Trigger Recovery
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

      {/* Confirmation Modal */}
      {confirmingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-xl">
            <div className="flex items-center space-x-4 mb-6">
              <div className="h-12 w-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Confirm Recovery</h3>
                <p className="text-sm text-gray-500 font-medium">This action cannot be undone.</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-6 font-medium">
              You are about to trigger account recovery for <span className="font-bold text-gray-900">{confirmingUser.full_name || confirmingUser.email}</span>. This will require them to set a new password on their next login.
            </p>
            
            <div className="mb-6">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 pl-1">
                To continue, enter the email <span className="text-indigo-600">{confirmingUser.email}</span> below:
              </label>
              <input
                type="email"
                value={confirmEmailInput}
                onChange={(e) => {
                  setConfirmEmailInput(e.target.value);
                  setConfirmError('');
                }}
                className={`w-full px-4 py-3 rounded-xl bg-gray-50 border focus:bg-white transition-all outline-none text-sm font-medium ${
                  confirmError ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20' : 'border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                }`}
                placeholder="user@example.com"
              />
              {confirmError && <p className="mt-2 text-xs text-rose-500 font-bold ml-1">{confirmError}</p>}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setConfirmingUser(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-black text-xs uppercase tracking-widest py-3 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={processRecovery}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl transition-all shadow-md shadow-rose-500/20"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
