import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useModal } from '../context/ModalContext';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';

export function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { showAlert } = useModal();

  useEffect(() => {
    // Check if we have a session (Supabase handles the recovery token automatically)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // If no session, they might have clicked an expired link or are trying to access directly
        console.log('No active session found for password reset');
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showAlert({
        title: 'Passwords mismatch',
        message: 'The passwords you entered do not match.',
        severity: 'error'
      });
      return;
    }

    if (password.length < 6) {
      showAlert({
        title: 'Weak password',
        message: 'Password must be at least 6 characters long.',
        severity: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      console.error('Error updating password:', err);
      showAlert({
        title: 'Update Failed',
        message: err.message || 'Failed to update password. The link might be expired.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-12 px-4 shadow-xl shadow-indigo-100/50 rounded-[2.5rem] border border-gray-100 text-center space-y-6">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-emerald-50 border-4 border-emerald-100">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Password Updated!</h2>
              <p className="text-gray-500 font-medium">Your password has been changed successfully.</p>
            </div>
            <p className="text-sm text-gray-400">Redirecting you to login page...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-8">
          <div className="h-16 w-16 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-200 rotate-3">
             <Lock className="h-8 w-8 text-white -rotate-3" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-black text-gray-900 tracking-tight">Set New Password</h2>
        <p className="mt-2 text-center text-sm text-gray-500 font-medium">
          Please enter your new password below.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-10 px-8 shadow-xl shadow-indigo-100/50 rounded-[2.5rem] border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-bold text-gray-900 focus:ring-2 focus:ring-indigo-600/10 focus:bg-white transition-all outline-none border border-transparent focus:border-indigo-100"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Confirm New Password</label>
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-bold text-gray-900 focus:ring-2 focus:ring-indigo-600/10 focus:bg-white transition-all outline-none border border-transparent focus:border-indigo-100"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-2xl shadow-lg text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Update Password'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
