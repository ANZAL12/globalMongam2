import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from '../services/supabase';

const safeStorage = {
    getItem: async (key: string) => {
        if (Platform.OS === 'web') {
            return localStorage.getItem(key);
        }
        return await AsyncStorage.getItem(key);
    },
    setItem: async (key: string, value: string) => {
        if (Platform.OS === 'web') {
            localStorage.setItem(key, value);
            return;
        }
        await AsyncStorage.setItem(key, value);
    },
    removeItem: async (key: string) => {
        if (Platform.OS === 'web') {
            localStorage.removeItem(key);
            return;
        }
        await AsyncStorage.removeItem(key);
    }
};

type AuthContextType = {
    isAuthenticated: boolean;
    role: string | null;
    isLoading: boolean;
    mustChangePassword: boolean;
    updateMustChangePassword: (status: boolean) => Promise<void>;
    login: (access: string, refresh: string, role: string, mustChangePassword?: boolean) => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    role: null,
    isLoading: true,
    mustChangePassword: false,
    updateMustChangePassword: async () => { },
    login: async () => { },
    logout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [role, setRole] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
    const allowedRoles = new Set(['admin', 'promoter', 'approver']);

    useEffect(() => {
        checkSession();
    }, []);

    const clearLocalSession = async () => {
        await safeStorage.removeItem('access');
        await safeStorage.removeItem('refresh');
        await safeStorage.removeItem('role');
        await safeStorage.removeItem('must_change_password');
        setRole(null);
        setMustChangePassword(false);
        setIsAuthenticated(false);
    };

    const checkSession = async () => {
        try {
            const token = await safeStorage.getItem('access');
            const storedRole = await safeStorage.getItem('role');

            if (token && storedRole) {
                // Validate token + profile from Supabase to prevent stale local role from granting access.
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (userError || !user) {
                    await clearLocalSession();
                    return;
                }

                const { data: userData, error: profileError } = await supabase
                    .from('users')
                    .select('role, must_change_password, is_active')
                    .eq('id', user.id)
                    .single();

                if (
                    profileError ||
                    !userData?.is_active ||
                    !allowedRoles.has(userData?.role)
                ) {
                    await supabase.auth.signOut();
                    await clearLocalSession();
                    return;
                }

                setIsAuthenticated(true);
                setRole(userData.role);
                setMustChangePassword(Boolean(userData.must_change_password));
            } else {
                await clearLocalSession();
            }
        } catch (error) {
            console.error('Error checking session:', error);
            await clearLocalSession();
        } finally {
            setIsLoading(false);
        }
    };

    const updateMustChangePassword = async (status: boolean) => {
        try {
            await safeStorage.setItem('must_change_password', status ? 'true' : 'false');
            setMustChangePassword(status);
        } catch (error) {
            console.error('Error updating must_change_password:', error);
        }
    };

    const login = async (access: string, refresh: string, userRole: string, mustChange: boolean = false) => {
        try {
            await safeStorage.setItem('access', access);
            await safeStorage.setItem('refresh', refresh);
            await safeStorage.setItem('role', userRole);
            await safeStorage.setItem('must_change_password', mustChange ? 'true' : 'false');
            setRole(userRole);
            setMustChangePassword(mustChange);
            setIsAuthenticated(true);
        } catch (error) {
            console.error('Error saving session:', error);
        }
    };

    const logout = async () => {
        try {
            // Clear push token from database first
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase
                    .from('users')
                    .update({ expo_push_token: null, fcm_web_push_token: null })
                    .eq('id', user.id);
            }

            await supabase.auth.signOut();
            await clearLocalSession();
        } catch (error) {
            console.error('Error clearing session:', error);
            await clearLocalSession();
        }
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, role, isLoading, mustChangePassword, updateMustChangePassword, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
