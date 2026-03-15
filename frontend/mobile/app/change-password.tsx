import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";

export default function ChangePassword() {
    const { updateMustChangePassword } = useAuth();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!newPassword || !confirmPassword) {
            Alert.alert("Error", "Please fill out both fields.");
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match.");
            return;
        }

        if (newPassword.length < 8) {
            Alert.alert("Error", "Password must be at least 8 characters long.");
            return;
        }

        setIsLoading(true);
        try {
            const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
            if (authError) throw authError;

            // Update user table so we know they changed it
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('users').update({ must_change_password: false }).eq('id', user.id);
            }

            Alert.alert("Success", "Password changed successfully! You can now access your account.");
            await updateMustChangePassword(false);
        } catch (error: any) {
            const msg = error.message || "Failed to change password. Please try again.";
            Alert.alert("Error", msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>Update Required</Text>
                <Text style={styles.subtitle}>For security reasons, you must change your password before continuing.</Text>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>New Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Min. 8 characters"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Confirm New Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Min. 8 characters"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, isLoading && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Change Password</Text>
                    )}
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
        fontSize: 26,
        fontWeight: "bold",
        color: "#d32f2f",
        textAlign: "center",
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 15,
        color: "#666",
        textAlign: "center",
        marginBottom: 25,
        lineHeight: 22,
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
    button: {
        backgroundColor: "#1976d2",
        borderRadius: 10,
        padding: 15,
        alignItems: "center",
        marginTop: 10,
    },
    buttonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
    disabledButton: {
        opacity: 0.6,
    },
});
