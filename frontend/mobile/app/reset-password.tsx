import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { supabase } from "../services/supabase";

type LinkState = "checking" | "ready" | "invalid" | "success";

function getRecoveryParams(url: string | null) {
  if (!url) return new URLSearchParams();

  const markerIndex = url.indexOf("#");
  if (markerIndex >= 0) {
    return new URLSearchParams(url.slice(markerIndex + 1));
  }

  const queryIndex = url.indexOf("?");
  return new URLSearchParams(queryIndex >= 0 ? url.slice(queryIndex + 1) : "");
}

export default function ResetPassword() {
  const router = useRouter();
  const [linkState, setLinkState] = useState<LinkState>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("Checking reset link...");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const prepareSession = async (url: string | null) => {
      const params = getRecoveryParams(url);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (!accessToken || !refreshToken) {
        if (!mounted) return;
        setMessage("This reset link is invalid or expired. Please request a new link from the admin.");
        setLinkState("invalid");
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (!mounted) return;

      if (error) {
        setMessage("This reset link is invalid or expired. Please request a new link from the admin.");
        setLinkState("invalid");
        return;
      }

      setMessage("Enter a new password for your account.");
      setLinkState("ready");
    };

    Linking.getInitialURL().then(prepareSession);

    const subscription = Linking.addEventListener("url", ({ url }) => {
      setLinkState("checking");
      setMessage("Checking reset link...");
      void prepareSession(url);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const handleSubmit = async () => {
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("Updating password...");

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("users")
          .update({ must_change_password: false })
          .eq("id", user.id);
      }

      await supabase.auth.signOut();
      setLinkState("success");
      setMessage("Password updated successfully. Please log in with your new password.");

      setTimeout(() => {
        router.replace("/login");
      }, 1800);
    } catch (error: any) {
      setMessage(error?.message || "Failed to update password. Please request a new reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={[styles.message, linkState === "invalid" && styles.errorText]}>{message}</Text>

        {linkState === "checking" && <ActivityIndicator size="large" color="#1976d2" />}

        {linkState === "ready" && (
          <>
            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter new password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Repeat new password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {linkState === "success" && <ActivityIndicator size="small" color="#16a34a" />}

        {linkState === "invalid" && (
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace("/login")}>
            <Text style={styles.secondaryButtonText}>Back to Login</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  errorText: {
    color: "#b91c1c",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: "#f9fafb",
  },
  button: {
    backgroundColor: "#1976d2",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#374151",
    fontWeight: "800",
  },
});
