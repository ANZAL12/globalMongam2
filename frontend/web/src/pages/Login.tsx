import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { GoogleLogin } from '@react-oauth/google';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const navigate = useNavigate();

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

            // Fetch user role
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('role, is_active')
                .eq('id', data.user.id)
                .single();

            if (userError) throw userError;

            if (!userData.is_active) {
                await supabase.auth.signOut();
                throw new Error('Your account has been disabled. Please contact the admin.');
            }

            const role = userData.role;
            localStorage.setItem('access', data.session.access_token);
            localStorage.setItem('role', role);

            if (role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/promoter');
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

            // Fetch user role
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('role, is_active')
                .eq('id', data.user.id)
                .single();

            if (userError) {
                // If user doesn't exist in 'users' table, log them out
                await supabase.auth.signOut();
                throw new Error('Not Registered. Please contact the admin.');
            }

            if (!userData.is_active) {
                await supabase.auth.signOut();
                throw new Error('Your account has been disabled. Please contact the admin.');
            }

            const role = userData.role;
            localStorage.setItem('access', data.session.access_token);
            localStorage.setItem('role', role);

            if (role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/promoter');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Google Login Failed');
        } finally {
            setGoogleLoading(false);
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
        </div>
    );
}
