import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { supabase } from "../../../services/supabase";
import { MaterialIcons } from "@expo/vector-icons";

export default function ApproverAddPromoter() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [shopName, setShopName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gPayNumber, setGPayNumber] = useState("");
  const [upiId, setUpiId] = useState("");
  const [confirmUpiId, setConfirmUpiId] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setShopName("");
    setPhoneNumber("");
    setGPayNumber("");
    setUpiId("");
    setConfirmUpiId("");
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim() || !fullName.trim() || !shopName.trim() || !phoneNumber.trim() || !gPayNumber.trim() || !upiId.trim() || !confirmUpiId.trim()) {
      Alert.alert("Missing fields", "Please fill all fields.");
      return;
    }
    if (password.trim().length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    if (password.trim() !== confirmPassword.trim()) {
      Alert.alert("Password mismatch", "Password and confirm password do not match.");
      return;
    }
    if (upiId.trim().toLowerCase() !== confirmUpiId.trim().toLowerCase()) {
      Alert.alert("UPI mismatch", "UPI ID and confirm UPI ID do not match.");
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      const { error } = await supabase.from("promoter_requests").insert({
        created_by: user.id,
        approver_id: user.id,
        email: email.trim().toLowerCase(),
        password: password.trim(),
        full_name: fullName.trim(),
        shop_name: shopName.trim(),
        phone_number: phoneNumber.trim(),
        gpay_number: gPayNumber.trim(),
        upi_id: upiId.trim(),
        status: "pending",
      });
      if (error) throw error;

      Alert.alert("Request submitted", "Promoter request sent to admin for approval.");
      resetForm();
    } catch (e: any) {
      const msg = e?.message || "Could not submit promoter request.";
      if (msg.includes("public.promoter_requests")) {
        Alert.alert(
          "Setup required",
          "Promoter request table is missing in database. Please ask admin to run the latest Supabase migration, then try again."
        );
      } else {
        Alert.alert("Failed", msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Add Promoter Request</Text>
      <Text style={styles.subtitle}>Submit promoter details for admin approval.</Text>

      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <View style={styles.passwordRow}>
        <TextInput
          style={[styles.input, styles.passwordInput]}
          placeholder={'give initial password as "password"'}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity style={styles.showToggle} onPress={() => setShowPassword((prev) => !prev)}>
          <MaterialIcons
            name={showPassword ? "visibility-off" : "visibility"}
            size={20}
            color="#1976d2"
          />
        </TouchableOpacity>
      </View>
      <View style={styles.passwordRow}>
        <TextInput
          style={[styles.input, styles.passwordInput]}
          placeholder="Confirm Password"
          secureTextEntry={!showConfirmPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <TouchableOpacity style={styles.showToggle} onPress={() => setShowConfirmPassword((prev) => !prev)}>
          <MaterialIcons
            name={showConfirmPassword ? "visibility-off" : "visibility"}
            size={20}
            color="#1976d2"
          />
        </TouchableOpacity>
      </View>
      <TextInput style={styles.input} placeholder="Full Name" value={fullName} onChangeText={setFullName} />
      <TextInput style={styles.input} placeholder="Shop Name / Location" value={shopName} onChangeText={setShopName} />
      <TextInput style={styles.input} placeholder="Phone Number" keyboardType="phone-pad" value={phoneNumber} onChangeText={setPhoneNumber} />
      <TextInput style={styles.input} placeholder="GPay Number" keyboardType="phone-pad" value={gPayNumber} onChangeText={setGPayNumber} />
      <TextInput style={styles.input} placeholder="UPI ID" autoCapitalize="none" value={upiId} onChangeText={setUpiId} />
      <TextInput style={styles.input} placeholder="Confirm UPI ID" autoCapitalize="none" value={confirmUpiId} onChangeText={setConfirmUpiId} />

      <TouchableOpacity style={[styles.submit, loading && styles.disabled]} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Send for Approval</Text>}
      </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "bold", color: "#222", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 16 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 15,
  },
  passwordRow: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 70,
  },
  showToggle: {
    position: "absolute",
    right: 12,
    top: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  submit: {
    marginTop: 6,
    backgroundColor: "#1976d2",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  disabled: { opacity: 0.6 },
});

