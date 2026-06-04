import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { GoogleLogin } from '@react-oauth/google';
import { syncWebPushToken } from '../services/firebaseMessaging';
import { Eye, EyeOff } from 'lucide-react';

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

    // Forgot password states
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotNewPassword, setForgotNewPassword] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotError, setForgotError] = useState<string | null>(null);
    const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

    // Password visibility states
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);

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

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotLoading(true);
        setForgotError(null);
        setForgotSuccess(null);

        try {
            const { error: rpcError } = await supabase.rpc('reset_forgotten_password', {
                p_email: forgotEmail,
                p_new_password: forgotNewPassword,
            });

            if (rpcError) throw rpcError;

            setForgotSuccess('Password updated successfully. You can now login.');
            setForgotEmail('');
            setForgotNewPassword('');
        } catch (err: any) {
            setForgotError(err.message || 'An error occurred while resetting the password.');
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <div className="min-h-screen h-[100dvh] flex items-center justify-center bg-[#f0f2f5] p-4 sm:p-5">
            <div className="w-full max-w-md bg-white rounded-[15px] p-5 sm:p-[25px] shadow-[0_2px_10px_rgba(0,0,0,0.1)] flex flex-col justify-center max-h-full">

                <div className="flex justify-center mb-4 sm:mb-10 shrink-0">
                    <img src="/logo.png" alt="Global Agencies Logo" className="h-[12vh] min-h-[60px] max-h-[176px] sm:h-44 object-contain" />
                </div>
                <div className="shrink-0">
                    <h1 className="text-[22px] sm:text-[28px] font-bold text-[#1a1a1a] text-center mb-1 sm:mb-[5px]">Welcome Back</h1>
                    <p className="text-sm sm:text-[16px] text-[#666] text-center mb-4 sm:mb-[30px]">Sign in to your account</p>
                </div>

                <form onSubmit={handleLogin} className="flex flex-col shrink">
                    {error && (
                        <div className="bg-[#ffebee] text-[#c62828] p-2 sm:p-3 rounded-[10px] text-xs sm:text-sm mb-3 sm:mb-4 text-center font-medium shrink-0">
                            {error}
                        </div>
                    )}

                    <div className="mb-3 sm:mb-[20px] shrink-0">
                        <label className="block text-xs sm:text-[14px] font-[600] text-[#444] mb-1 sm:mb-[8px]">Email Address</label>
                        <input
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#f9f9f9] border border-[#e1e1e1] rounded-[10px] p-3 sm:p-[15px] text-sm sm:text-[16px] outline-none focus:border-[#1976d2]"
                            placeholder="email@example.com"
                        />
                    </div>

                    <div className="mb-3 sm:mb-[20px] shrink-0">
                        <label className="block text-xs sm:text-[14px] font-[600] text-[#444] mb-1 sm:mb-[8px]">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#f9f9f9] border border-[#e1e1e1] rounded-[10px] p-3 sm:p-[15px] text-sm sm:text-[16px] outline-none focus:border-[#1976d2] pr-12"
                                placeholder="********"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        <div className="flex justify-end mt-2">
                            <button
                                type="button"
                                onClick={() => setShowForgotModal(true)}
                                className="text-sm font-medium text-[#1976d2] hover:underline"
                            >
                                Forgot Password?
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || googleLoading}
                        className={`w-full bg-[#1976d2] rounded-[10px] p-3 sm:p-[15px] flex items-center justify-center mt-2 sm:mt-[10px] shrink-0 ${(loading || googleLoading) ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                        {loading ? (
                            <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                            <span className="text-white text-base sm:text-[18px] font-bold">Login</span>
                        )}
                    </button>

                    <div className="flex flex-row items-center my-3 sm:my-[25px] shrink-0">
                        <div className="flex-1 h-[1px] bg-[#e1e1e1]" />
                        <span className="mx-[10px] sm:mx-[15px] text-[#999] font-[600] text-xs sm:text-[14px]">OR</span>
                        <div className="flex-1 h-[1px] bg-[#e1e1e1]" />
                    </div>

                    <div className="flex justify-center w-full shrink-0">
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

            {showForgotModal && (
                <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl relative">
                        <button
                            type="button"
                            onClick={() => { setShowForgotModal(false); setForgotSuccess(null); setForgotError(null); }}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
                        >
                            ✕
                        </button>
                        <h2 className="text-xl font-bold text-[#1a1a1a] mb-2">Forgot Password</h2>
                        <p className="text-sm text-[#666] mb-5">
                            If your account requires a password change, you can set it here.
                        </p>
                        
                        <form onSubmit={handleForgotPassword}>
                            {forgotError && (
                                <div className="bg-[#ffebee] text-[#c62828] p-2 sm:p-3 rounded-[10px] text-xs sm:text-sm mb-4 text-center font-medium">
                                    {forgotError}
                                </div>
                            )}
                            {forgotSuccess && (
                                <div className="bg-green-50 text-green-700 p-2 sm:p-3 rounded-[10px] text-xs sm:text-sm mb-4 text-center font-medium border border-green-200">
                                    {forgotSuccess}
                                </div>
                            )}
                            
                            <div className="mb-4">
                                <label className="block text-[14px] font-[600] text-[#444] mb-2">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    className="w-full bg-[#f9f9f9] border border-[#e1e1e1] rounded-[10px] p-[12px] text-[15px] outline-none focus:border-[#1976d2]"
                                    placeholder="email@example.com"
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-[14px] font-[600] text-[#444] mb-2">New Password</label>
                                <div className="relative">
                                    <input
                                        type={showForgotNewPassword ? "text" : "password"}
                                        required
                                        value={forgotNewPassword}
                                        onChange={(e) => setForgotNewPassword(e.target.value)}
                                        className="w-full bg-[#f9f9f9] border border-[#e1e1e1] rounded-[10px] p-[12px] text-[15px] outline-none focus:border-[#1976d2] pr-12"
                                        placeholder="Min. 8 characters"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                    >
                                        {showForgotNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={forgotLoading || !!forgotSuccess}
                                className={`w-full bg-[#1976d2] rounded-[10px] p-[12px] text-white font-bold ${(forgotLoading || !!forgotSuccess) ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                {forgotLoading ? 'Updating...' : 'Update Password'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
