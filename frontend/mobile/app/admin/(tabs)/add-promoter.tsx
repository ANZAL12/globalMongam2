import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Keyboard } from "react-native";
import { supabase } from "../../../services/supabase";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AddPromoter() {
    const [email, setEmail] = useState("");
    const [shopName, setShopName] = useState("");
    const [fullName, setFullName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [gPayNumber, setGPayNumber] = useState("");
    const [password, setPassword] = useState("");
    const [upiId, setUpiId] = useState("");
    const [loading, setLoading] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow',
            () => {
                setKeyboardVisible(true);
            }
        );
        const keyboardDidHideListener = Keyboard.addListener(
            Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide',
            () => {
                setKeyboardVisible(false);
            }
        );

        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, []);

    const handleCreatePromoter = async () => {
        if (!email.trim() || !shopName.trim() || !fullName.trim() || !phoneNumber.trim() || !password.trim() || !gPayNumber.trim() || !upiId.trim()) {
            Alert.alert("Error", "Please fill in all fields, including GPay Number and UPI ID.");
            return;
        }

        if (password.length < 8) {
            Alert.alert("Error", "Password must be at least 8 characters long.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            Alert.alert("Error", "Please enter a valid email address.");
            return;
        }

        setLoading(true);
        try {
            // Call the custom RPC to bypass email rate limits
            const { data: rpcData, error: rpcError } = await supabase.rpc('admin_create_promoter', {
                p_email: email.trim().toLowerCase(),
                p_password: password.trim(),
                p_full_name: fullName.trim(),
                p_shop_name: shopName.trim(),
                p_phone_number: phoneNumber.trim(),
                p_gpay_number: gPayNumber.trim(),
                p_upi_id: upiId.trim()
            });

            if (rpcError) throw rpcError;

            // The RPC returns a JSON object. We check if there's an error in it.
            if (rpcData && rpcData.error) {
                throw new Error(rpcData.error);
            }

            Alert.alert("Success", "Promoter account created successfully!");
            setEmail("");
            setShopName("");
            setFullName("");
            setPhoneNumber("");
            setGPayNumber("");
            setUpiId("");
            setPassword("");

            // Redirect back to dashboard
            router.replace("/admin");
        } catch (error: any) {
            console.error(error);
            const errorMessage = error.message || "Failed to create promoter.";
            Alert.alert("Error", errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        >
            <ScrollView
                contentContainerStyle={[
                    styles.scrollContainer,
                    { paddingBottom: keyboardVisible && Platform.OS === "android" ? 220 : 20 }
                ]}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.title}>Add New Promoter</Text>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Promoter Google Email *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="promoter@gmail.com"
                        placeholderTextColor="#999"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Password (Min 8 chars) *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="********"
                        placeholderTextColor="#999"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Shop Name / Location *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Electronics Hub - Downtown"
                        placeholderTextColor="#999"
                        value={shopName}
                        onChangeText={setShopName}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Full Name *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="John Doe"
                        placeholderTextColor="#999"
                        value={fullName}
                        onChangeText={setFullName}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Phone Number *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="+91 9876543210"
                        placeholderTextColor="#999"
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        keyboardType="phone-pad"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>GPay Number *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="+91 9876543210"
                        placeholderTextColor="#999"
                        value={gPayNumber}
                        onChangeText={setGPayNumber}
                        keyboardType="phone-pad"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>UPI ID *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="username@upi"
                        placeholderTextColor="#999"
                        value={upiId}
                        onChangeText={setUpiId}
                        autoCapitalize="none"
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleCreatePromoter}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Submit Registration</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    scrollContainer: {
        padding: 20,
        flexGrow: 1,
        justifyContent: "center",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 30,
        color: "#333",
        textAlign: "center",
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: "500",
        marginBottom: 8,
        color: "#555",
    },
    input: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#ddd",
        padding: 15,
        borderRadius: 8,
        fontSize: 16,
    },
    button: {
        backgroundColor: "#4caf50",
        padding: 15,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 10,
    },
    buttonDisabled: {
        backgroundColor: "#a5d6a7",
    },
    buttonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
});
