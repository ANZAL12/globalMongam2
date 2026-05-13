import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { GoogleLogin } from '@react-oauth/google';
import { syncWebPushToken } from '../services/firebaseMessaging';

type PendingLogin = {
    accessToken: string;
    role: string;
};

const ALLOWED_ROLES = new Set(['admin', 'promoter', 'approver']);

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordUpdateLoading, setPasswordUpdateLoading] = useState(false);
    const [pendingLogin, setPendingLogin] = useState<PendingLogin | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const bootstrapForcedPasswordChange = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const { data: userData, error } = await supabase
                .from('users')
                .select('role, is_active, must_change_password')
                .eq('id', session.user.id)
                .single();

            if (error || !userData?.is_active || !ALLOWED_ROLES.has(userData?.role)) {
                await supabase.auth.signOut();
                localStorage.removeItem('access');
                localStorage.removeItem('role');
                return;
            }

            if (userData.must_change_password) {
                setPendingLogin({ accessToken: session.access_token, role: userData.role });
                setShowChangePasswordModal(true);
                return;
            }

            // Session is valid and no password change is required, continue normally.
            finalizeLogin(session.access_token, userData.role);
        };

        void bootstrapForcedPasswordChange();
    }, []);

    const finalizeLogin = async (accessToken: string, role: string) => {
        localStorage.setItem('access', accessToken);
        localStorage.setItem('role', role);
        
        if (role === 'admin') {
            navigate('/admin');
        } else if (role === 'approver') {
            await syncWebPushToken();
            navigate('/approver');
        } else {
            await syncWebPushToken();
            navigate('/promoter');
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) {
            setError('Please enter both email and password.');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password: password.trim()
            });

            if (authError) throw authError;

            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('role, is_active, must_change_password')
                .eq('id', data.user.id)
                .single();

            if (userError) {
                await supabase.auth.signOut();
                throw new Error('Not Registered. Please contact the admin.');
            }

            if (!userData.is_active) {
                await supabase.auth.signOut();
                throw new Error('Your account has been disabled. Please contact the admin.');
            }

            if (!ALLOWED_ROLES.has(userData.role)) {
                await supabase.auth.signOut();
                throw new Error('Access denied. Only registered admins, approvers, and promoters can sign in.');
            }

            if (userData.must_change_password) {
                setPendingLogin({ accessToken: data.session.access_token, role: userData.role });
                setShowChangePasswordModal(true);
            } else {
                finalizeLogin(data.session.access_token, userData.role);
            }
        } catch (err: any) {
            setError(err.message || 'Invalid email or password.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse: any) => {
        setGoogleLoading(true);
        setError('');
        try {
            const { data, error: authError } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: credentialResponse.credential,
            });

            if (authError) throw authError;

            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('role, is_active, must_change_password')
                .eq('id', data.user.id)
                .single();

            if (userError) {
                await supabase.auth.signOut();
                throw new Error('Not Registered. Please contact the admin.');
            }

            if (!userData.is_active) {
                await supabase.auth.signOut();
                throw new Error('Your account has been disabled. Please contact the admin.');
            }

            if (!ALLOWED_ROLES.has(userData.role)) {
                await supabase.auth.signOut();
                throw new Error('Access denied. Only registered admins, approvers, and promoters can sign in.');
            }

            if (userData.must_change_password) {
                setPendingLogin({ accessToken: data.session.access_token, role: userData.role });
                setShowChangePasswordModal(true);
            } else {
                finalizeLogin(data.session.access_token, userData.role);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Google Login Failed');
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!pendingLogin) return;
        if (!newPassword.trim() || !confirmPassword.trim()) {
            setError('Please fill out both password fields.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        setError('');
        setPasswordUpdateLoading(true);
        try {
            const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
            if (passwordError) throw passwordError;

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error: profileError } = await supabase
                    .from('users')
                    .update({ must_change_password: false })
                    .eq('id', user.id);
                if (profileError) throw profileError;
            }

            setShowChangePasswordModal(false);
            setNewPassword('');
            setConfirmPassword('');
            finalizeLogin(pendingLogin.accessToken, pendingLogin.role);
            setPendingLogin(null);
        } catch (err: any) {
            setError(err.message || 'Failed to update password. Please try again.');
        } finally {
            setPasswordUpdateLoading(false);
        }
    };

    const handleGoogleError = () => {
        console.error("Google Login Failed");
        setError('Google Login Failed');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5] p-5">
            <div className="w-full max-w-md bg-white rounded-[15px] p-[25px] shadow-[0_2px_10px_rgba(0,0,0,0.1)]">

                <div className="flex justify-center mb-10">
                    <img src="/logo.png" alt="Global Agencies Logo" className="h-44 object-contain" />
                </div>
                <h1 className="text-[28px] font-bold text-[#1a1a1a] text-center mb-[5px]">Welcome Back</h1>
                <p className="text-[16px] text-[#666] text-center mb-[30px]">Sign in to your account</p>

                <form onSubmit={handleLogin}>
                    {error && (
                        <div className="bg-[#ffebee] text-[#c62828] p-3 rounded-[10px] text-sm mb-4 text-center font-medium">
                            {error}
                        </div>
                    )}

                    <div className="mb-[20px]">
                        <label className="block text-[14px] font-[600] text-[#444] mb-[8px]">Email Address</label>
                        <input
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#f9f9f9] border border-[#e1e1e1] rounded-[10px] p-[15px] text-[16px] outline-none focus:border-[#1976d2]"
                            placeholder="email@example.com"
                        />
                    </div>

                    <div className="mb-[20px]">
                        <label className="block text-[14px] font-[600] text-[#444] mb-[8px]">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#f9f9f9] border border-[#e1e1e1] rounded-[10px] p-[15px] text-[16px] outline-none focus:border-[#1976d2]"
                            placeholder="********"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || googleLoading}
                        className={`w-full bg-[#1976d2] rounded-[10px] p-[15px] flex items-center justify-center mt-[10px] ${(loading || googleLoading) ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                        {loading ? (
                            <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                            <span className="text-white text-[18px] font-bold">Login</span>
                        )}
                    </button>

                    <div className="flex flex-row items-center my-[25px]">
                        <div className="flex-1 h-[1px] bg-[#e1e1e1]" />
                        <span className="mx-[15px] text-[#999] font-[600] text-[14px]">OR</span>
                        <div className="flex-1 h-[1px] bg-[#e1e1e1]" />
                    </div>

                    <div className="flex justify-center w-full">
                        {googleLoading ? (
                            <div className="w-full bg-white border border-[#dcdcdc] rounded-[10px] p-[15px] flex items-center justify-center opacity-60">
                                <span className="w-5 h-5 border-2 border-[#1976d2]/40 border-t-[#1976d2] rounded-full animate-spin" />
                            </div>
                        ) : (
                            <div className="w-full overflow-hidden rounded-[10px]">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={handleGoogleError}
                                    width="100%"
                                    size="large"
                                    type="standard"
                                    text="signin_with"
                                    shape="rectangular"
                                />
                            </div>
                        )}
                    </div>
                </form>
            </div>
            {showChangePasswordModal && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl">
                        <h2 className="text-xl font-bold text-[#1a1a1a] mb-2">Change Password Required</h2>
                        <p className="text-sm text-[#666] mb-5">
                            For security, update your temporary password before continuing.
                        </p>
                        <div className="mb-4">
                            <label className="block text-[14px] font-[600] text-[#444] mb-2">New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full bg-[#f9f9f9] border border-[#e1e1e1] rounded-[10px] p-[12px] text-[15px] outline-none focus:border-[#1976d2]"
                                placeholder="Min. 8 characters"
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-[14px] font-[600] text-[#444] mb-2">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-[#f9f9f9] border border-[#e1e1e1] rounded-[10px] p-[12px] text-[15px] outline-none focus:border-[#1976d2]"
                                placeholder="Repeat new password"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleChangePassword}
                            disabled={passwordUpdateLoading}
                            className={`w-full bg-[#1976d2] rounded-[10px] p-[12px] text-white font-bold ${passwordUpdateLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                            {passwordUpdateLoading ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
