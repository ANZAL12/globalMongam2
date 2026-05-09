import React, { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { Alert } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import { useRouter } from "expo-router";
import { useAuth } from "./AuthContext";
import { supabase } from "../services/supabase";
import { syncPushTokenToBackend } from "../services/notifications";

const ALLOWED_ROLES = new Set(["admin", "promoter", "approver"]);

type GoogleSignInContextType = {
    /** True when the Google auth request is ready for promptAsync */
    googleSignInReady: boolean;
    promptGoogleSignIn: () => Promise<void>;
};

const GoogleSignInContext = createContext<GoogleSignInContextType>({
    googleSignInReady: false,
    promptGoogleSignIn: async () => {},
});

export const useGoogleSignIn = () => useContext(GoogleSignInContext);

/**
 * Holds expo-auth-session Google hook above the router so it stays mounted when OAuth
 * returns via deep link (e.g. global-agencies://oauth2redirect). Otherwise Login unmounts,
 * the hook is torn down, and the auth result is lost.
 */
export function GoogleSignInProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { login, logout } = useAuth();

    const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
        clientId: "862395033084-o6e5bpleh1t4ot99pbmius6gkrak9hnu.apps.googleusercontent.com",
        webClientId: "862395033084-o6e5bpleh1t4ot99pbmius6gkrak9hnu.apps.googleusercontent.com",
        androidClientId: "389146058293-s9rjophl6kkbu893v3b6lionf93pf2e6.apps.googleusercontent.com",
        iosClientId: "862395033084-si99fukoqvv2mi35u7hsafvf5tpcmtkf.apps.googleusercontent.com",
    });

    const handleGoogleLogin = useCallback(
        async (idToken: string) => {
            try {
                const { data, error: authError } = await supabase.auth.signInWithIdToken({
                    provider: "google",
                    token: idToken,
                });

                if (authError) throw authError;

                const { data: userData, error: userError } = await supabase
                    .from("users")
                    .select("role, must_change_password, is_active")
                    .eq("id", data.user.id)
                    .single();

                if (userError) {
                    await supabase.auth.signOut();
                    throw new Error("Not Registered. Please contact the admin.");
                }

                if (!userData.is_active) {
                    await supabase.auth.signOut();
                    throw new Error("Your account has been disabled. Please contact the admin.");
                }

                if (!ALLOWED_ROLES.has(userData.role)) {
                    await supabase.auth.signOut();
                    throw new Error("Access denied. Only registered admins, promoters, and approvers can sign in.");
                }

                await login(
                    data.session.access_token,
                    data.session.refresh_token,
                    userData.role,
                    userData.must_change_password
                );
            } catch (error: unknown) {
                console.error(error);
                const message = error instanceof Error ? error.message : "Failed to sign in with Google";
                await logout();
                Alert.alert("Login Failed", message);
                router.replace("/login");
            }
        },
        [login, logout, router]
    );

    useEffect(() => {
        if (!response) return;

        if (response.type === "success") {
            const authObj = response.authentication as { idToken?: string; id_token?: string } | null;
            const idToken = authObj?.idToken || authObj?.id_token || response.params?.id_token;

            if (idToken) {
                void handleGoogleLogin(idToken);
            } else {
                Alert.alert("Google Login Error", "Authentication succeeded but no ID token was returned.");
                router.replace("/login");
            }
            return;
        }

        if (response.type === "error") {
            Alert.alert(
                "Google Login Error",
                response.error?.message || response.params?.error_description || "Something went wrong."
            );
            router.replace("/login");
            return;
        }

        // cancel, dismiss, locked, etc.
        router.replace("/login");
    }, [response, handleGoogleLogin, router]);

    const promptGoogleSignIn = useCallback(async () => {
        await promptAsync();
    }, [promptAsync]);

    const value = useMemo(
        () => ({
            googleSignInReady: !!request,
            promptGoogleSignIn,
        }),
        [request, promptGoogleSignIn]
    );

    return <GoogleSignInContext.Provider value={value}>{children}</GoogleSignInContext.Provider>;
}
