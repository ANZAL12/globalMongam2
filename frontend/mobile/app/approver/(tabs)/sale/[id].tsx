import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { supabase } from "../../../../services/supabase";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../../../context/AuthContext";
import AppHeader from "../../../../components/AppHeader";

type Sale = {
  id: string;
  product_name: string;
  model_no: string | null;
  serial_no: string | null;
  bill_no: string | null;
  bill_amount: string;
  bill_image_url: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  promoter: {
    email: string | null;
  } | null;
};

export default function ApproverSaleDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { logout } = useAuth();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchSale();
    }
  }, [id]);

  const fetchSale = async () => {
    try {
      const { data, error } = await supabase
        .from("sales")
        .select(
          `
                    *,
                    promoter:users!promoter_id (
                        email
                    )
                `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      setSale(data);
    } catch (error) {
      console.error("Failed to fetch sale details", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSaleStatus = async (status: string) => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("sales")
        .update({
          status,
          approved_by: status === "approver_approved" ? user?.id : null,
        })
        .eq("id", id);

      if (error) throw error;

      Alert.alert("Success", `Sale has been ${status === "approver_approved" ? "approved" : "rejected"}.`);
      fetchSale();
    } catch (error) {
      console.error("Failed to update sale status", error);
      Alert.alert("Error", "Failed to update sale status.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  if (!sale) {
    return (
      <View style={styles.center}>
        <Text>Sale not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>

      <View style={styles.contentHeader}>
        <Text style={styles.headerTitle}>Sale Details</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Status</Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  sale.status === "pending"
                    ? "#fff3e0"
                    : sale.status === "approver_approved" || sale.status === "paid"
                    ? "#e8f5e9"
                    : "#ffebee",
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    sale.status === "pending"
                      ? "#ef6c00"
                      : sale.status === "approver_approved" || sale.status === "paid"
                      ? "#2e7d32"
                      : "#c62828",
                },
              ]}
            >
              {sale.status.replace("_", " ").toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.label}>Product</Text>
          <Text style={styles.value}>{sale.product_name}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Model No</Text>
          <Text style={styles.value}>{sale.model_no || "N/A"}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Serial No</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.value}>{sale.serial_no || "N/A"}</Text>
            {sale.serial_no && (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/approver/sale/duplicates",
                    params: { serial: sale.serial_no, currentSaleId: sale.id },
                  })
                }
                style={styles.duplicateButton}
              >
                <MaterialIcons name="content-copy" size={16} color="#1976d2" />
                <Text style={styles.duplicateText}>Check Duplicates</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Bill No</Text>
          <Text style={styles.value}>{sale.bill_no || "N/A"}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Amount</Text>
          <Text style={[styles.value, styles.amountText]}>₹{sale.bill_amount}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Promoter</Text>
          <Text style={styles.value}>{sale.promoter?.email || "Unknown"}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{new Date(sale.created_at).toLocaleString()}</Text>
        </View>
      </View>

      {sale.bill_image_url && (
        <View style={styles.imageCard}>
          <Text style={styles.label}>Bill Image</Text>
          <Image source={{ uri: sale.bill_image_url }} style={styles.billImage} resizeMode="contain" />
        </View>
      )}      {sale.status === "pending" && (
        <View style={styles.actionCard}>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => updateSaleStatus("rejected")}
              disabled={processing}
            >
              <MaterialIcons name="close" size={20} color="#fff" />
              <Text style={styles.buttonText}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => updateSaleStatus("approver_approved")}
              disabled={processing}
            >
              <MaterialIcons name="check" size={20} color="#fff" />
              <Text style={styles.buttonText}>Approve</Text>
            </TouchableOpacity>
          </View>
        </View>
      )})}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  contentHeader: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  card: {
    backgroundColor: "#fff",
    margin: 15,
    padding: 20,
    borderRadius: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageCard: {
    backgroundColor: "#fff",
    margin: 15,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    elevation: 3,
  },
  actionCard: {
    backgroundColor: "#fff",
    margin: 15,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    elevation: 3,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoRow: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  amountText: {
    color: "#1976d2",
    fontSize: 18,
    fontWeight: "bold",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 15,
  },
  billImage: {
    width: "100%",
    height: 400,
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    flex: 0.48,
    flexDirection: "row",
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  approveButton: {
    backgroundColor: "#4caf50",
  },
  rejectButton: {
    backgroundColor: "#f44336",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  rejectInputContainer: {
    width: "100%",
  },
  textInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    height: 80,
    textAlignVertical: "top",
    marginBottom: 15,
    marginTop: 5,
  },
  cancelButton: {
    backgroundColor: "#eee",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "bold",
  },
  confirmRejectButton: {
    backgroundColor: "#f44336",
  },
  rejectionContainer: {
    marginTop: 10,
    padding: 12,
    backgroundColor: "#fff5f5",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#f44336",
  },
  rejectionLabel: {
    fontSize: 12,
    color: "#c62828",
    fontWeight: "bold",
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 14,
    color: "#333",
  },
  duplicateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginLeft: 10,
  },
  duplicateText: {
    fontSize: 12,
    color: "#1976d2",
    fontWeight: "bold",
    marginLeft: 4,
  },
});
