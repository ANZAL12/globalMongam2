import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
  TouchableOpacity,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { supabase } from "../../../services/supabase";

type SaleDetail = {
  id: string;
  product_name: string;
  model_no: string | null;
  serial_no: string | null;
  bill_no: string | null;
  bill_amount: string;
  bill_image_url?: string | null;
  status: string;
  created_at: string;
  promoter?: {
    full_name?: string | null;
    email?: string | null;
    phone_number?: string | null;
    shop_name?: string | null;
  } | null;
};

export default function ApproverSaleDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const normalizeSerial = (serial: string | null | undefined) => serial?.trim().toLowerCase() || "";

  useEffect(() => {
    fetchSaleDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchSaleDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sales")
        .select(
          `
          *,
          promoter:users!promoter_id (
            full_name,
            email,
            phone_number,
            shop_name
          )
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      setSale(data as any);

      const serialKey = normalizeSerial((data as any)?.serial_no);
      if (serialKey) {
        const { data: duplicateSales, error: duplicateError } = await supabase
          .from("sales")
          .select("id, serial_no")
          .ilike("serial_no", (data as any).serial_no.trim());

        if (duplicateError) throw duplicateError;
        const duplicateMatches = (duplicateSales || []).filter(
          (row: any) => normalizeSerial(row.serial_no) === serialKey
        );
        setDuplicateCount(duplicateMatches.length);
      } else {
        setDuplicateCount(0);
      }
    } catch (error) {
      console.error("Failed to fetch sale:", error);
      Alert.alert("Error", "Could not load sale details.");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (newStatus: "approver_approved" | "rejected") => {
    if (!sale) return;
    setProcessing(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("sales")
        .update({
          status: newStatus,
          approved_at: newStatus === "approver_approved" ? new Date().toISOString() : null,
          approved_by: user?.id,
        })
        .eq("id", sale.id);

      if (error) throw error;
      Alert.alert("Success", `Sale ${newStatus === "approver_approved" ? "approved" : "rejected"} successfully.`);
      router.replace("/approver/(tabs)/sales");
    } catch (error) {
      console.error("Error updating sale:", error);
      Alert.alert("Error", "Failed to update sale status.");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approver_approved":
      case "approved":
      case "paid":
        return "#4caf50";
      case "rejected":
        return "#f44336";
      case "pending":
        return "#ff9800";
      default:
        return "#666";
    }
  };

  if (loading || !sale) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  const isPending = sale.status === "pending";

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sale Details</Text>
      </View>

      <View style={styles.statusBanner}>
        <Text style={[styles.statusText, { color: getStatusColor(sale.status) }]}>
          {sale.status.replace("_", " ").toUpperCase()}
        </Text>
      </View>
      {duplicateCount > 1 ? (
        <View style={styles.duplicateBanner}>
          <Text style={styles.duplicateTitle}>DUPLICATE SERIAL ALERT</Text>
          <Text style={styles.duplicateMessage}>
            This serial number already exists in {duplicateCount - 1} other uploaded sale(s).
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.label}>Product</Text>
            <Text style={styles.value}>{sale.product_name}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.label}>Bill Amount</Text>
            <Text style={styles.amount}>₹{sale.bill_amount}</Text>
          </View>
        </View>

        {!!sale.model_no && (
          <>
            <Text style={styles.label}>Model</Text>
            <Text style={styles.value}>{sale.model_no}</Text>
          </>
        )}
        {!!sale.serial_no && (
          <>
            <Text style={styles.label}>Serial</Text>
            <Text style={styles.value}>{sale.serial_no}</Text>
          </>
        )}
        {!!sale.bill_no && (
          <>
            <Text style={styles.label}>Bill No</Text>
            <Text style={styles.value}>{sale.bill_no}</Text>
          </>
        )}
        <Text style={styles.label}>Submitted</Text>
        <Text style={styles.value}>{new Date(sale.created_at).toLocaleString()}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Promoter</Text>
        <Text style={styles.value}>{sale.promoter?.full_name || "—"}</Text>
        <Text style={styles.subValue}>{sale.promoter?.email || "—"}</Text>
        <Text style={styles.subValue}>{sale.promoter?.shop_name || "—"}</Text>
        <Text style={styles.subValue}>{sale.promoter?.phone_number || "—"}</Text>
      </View>

      {sale.bill_image_url ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Bill Image</Text>
          <TouchableOpacity onPress={() => setIsImageModalVisible(true)} activeOpacity={0.8} style={styles.thumbnailButton}>
            <Image source={{ uri: sale.bill_image_url }} style={styles.image} resizeMode="cover" />
            <View style={styles.zoomOverlay}>
              <MaterialIcons name="zoom-in" size={22} color="#fff" />
              <Text style={styles.zoomText}>Tap to Enlarge</Text>
            </View>
          </TouchableOpacity>
        </View>
      ) : null}

      {processing ? <ActivityIndicator style={{ marginVertical: 20 }} color="#1976d2" /> : null}

      {!processing && isPending ? (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() =>
              Alert.alert("Reject Sale", "Are you sure you want to reject this sale?", [
                { text: "Cancel", style: "cancel" },
                { text: "Reject", style: "destructive", onPress: () => handleAction("rejected") },
              ])
            }
          >
            <Text style={styles.rejectText}>Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.approveButton]} onPress={() => handleAction("approver_approved")}>
            <Text style={styles.approveText}>Approve</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {sale.bill_image_url ? (
        <Modal
          visible={isImageModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsImageModalVisible(false)}
        >
          <View style={styles.modalBackground}>
            <TouchableOpacity style={styles.closeModalButton} onPress={() => setIsImageModalVisible(false)}>
              <MaterialIcons name="close" size={32} color="#fff" />
            </TouchableOpacity>
            <Image source={{ uri: sale.bill_image_url }} style={styles.fullScreenImage} resizeMode="contain" />
          </View>
        </Modal>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 15,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  backButton: {
    padding: 6,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  statusBanner: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  duplicateBanner: {
    backgroundColor: "#ffebee",
    borderColor: "#ffcdd2",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  duplicateTitle: {
    fontWeight: "bold",
    fontSize: 12,
    color: "#b71c1c",
  },
  duplicateMessage: {
    color: "#c62828",
    fontSize: 13,
    marginTop: 4,
    fontWeight: "600",
  },
  statusText: {
    fontWeight: "bold",
    fontSize: 14,
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
    marginBottom: 10,
  },
  subValue: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  amount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1976d2",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  thumbnailButton: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#eee",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  zoomOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  zoomText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 8,
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 25,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectButton: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#ffebee",
  },
  approveButton: {
    backgroundColor: "#1976d2",
  },
  rejectText: {
    color: "#f44336",
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  approveText: {
    color: "#fff",
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeModalButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  fullScreenImage: {
    width: "100%",
    height: "80%",
  },
});

