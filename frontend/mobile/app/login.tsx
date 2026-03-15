import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import * as AuthSession from "expo-auth-session";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
    const router = useRouter();
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isPasswordLoading, setIsPasswordLoading] = useState(false);

    const redirectUri = AuthSession.makeRedirectUri();

    const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
        clientId: "612035335688-guimkribnu2kdunbv3ivrql507n7qb6s.apps.googleusercontent.com",
    });

    useEffect(() => {
        if (response?.type === "success") {
            const authObj = response.authentication as any;
            const idToken = authObj?.idToken || authObj?.id_token || response.params?.id_token;

            if (idToken) {
                handleGoogleLogin(idToken);
            } else {
                Alert.alert("Google Login Error", "Authentication succeeded but no ID token was returned.");
            }
        }
    }, [response]);

    const handleGoogleLogin = async (idToken: string) => {
        try {
            const { data, error: authError } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: idToken,
            });

            if (authError) throw authError;

            // Fetch user role
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('role, must_change_password')
                .eq('id', data.user.id)
                .single();

            if (userError) {
                await supabase.auth.signOut();
                throw new Error('Not Registered. Please contact the admin.');
            }

            await login(data.session.access_token, data.session.refresh_token, userData.role, userData.must_change_password);
        } catch (error: any) {
            console.error(error);
            Alert.alert(
                "Login Failed",
                error.message || "Failed to sign in with Google"
            );
        }
    };

    const handlePasswordLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert("Error", "Please enter both email and password.");
            return;
        }

        setIsPasswordLoading(true);
        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password: password.trim(),
            });

            if (authError) throw authError;

            // Fetch user role
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('role, must_change_password')
                .eq('id', data.user.id)
                .single();

            if (userError) throw userError;

            await login(data.session.access_token, data.session.refresh_token, userData.role, userData.must_change_password);
        } catch (error: any) {
            const msg = error.message || "Invalid email or password.";
            Alert.alert(msg === "Invalid login credentials" ? "Login Failed" : "Error", msg);
        } finally {
            setIsPasswordLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Sign in to your account</Text>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email Address</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="email@example.com"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="********"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                <TouchableOpacity
                    style={[styles.loginButton, isPasswordLoading && styles.disabledButton]}
                    onPress={handlePasswordLogin}
                    disabled={isPasswordLoading}
                >
                    {isPasswordLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.loginButtonText}>Login</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.separatorContainer}>
                    <View style={styles.separator} />
                    <Text style={styles.separatorText}>OR</Text>
                    <View style={styles.separator} />
                </View>

                <TouchableOpacity
                    style={[styles.googleButton, !request && styles.disabledButton]}
                    onPress={() => promptAsync()}
                    disabled={!request}
                >
                    <Text style={styles.googleButtonText}>Sign in with Google</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f0f2f5",
        justifyContent: "center",
        padding: 20,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 15,
        padding: 25,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#1a1a1a",
        textAlign: "center",
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
        marginBottom: 30,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#444",
        marginBottom: 8,
    },
    input: {
        backgroundColor: "#f9f9f9",
        borderWidth: 1,
        borderColor: "#e1e1e1",
        borderRadius: 10,
        padding: 15,
        fontSize: 16,
    },
    loginButton: {
        backgroundColor: "#1976d2",
        borderRadius: 10,
        padding: 15,
        alignItems: "center",
        marginTop: 10,
    },
    loginButtonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
    googleButton: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#dcdcdc",
        borderRadius: 10,
        padding: 15,
        alignItems: "center",
    },
    googleButtonText: {
        color: "#555",
        fontSize: 16,
        fontWeight: "600",
    },
    disabledButton: {
        opacity: 0.6,
    },
    separatorContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 25,
    },
    separator: {
        flex: 1,
        height: 1,
        backgroundColor: "#e1e1e1",
    },
    separatorText: {
        marginHorizontal: 15,
        color: "#999",
        fontWeight: "600",
        fontSize: 14,
    },
});
