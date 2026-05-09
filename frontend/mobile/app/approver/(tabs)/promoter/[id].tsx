import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, FlatList, Linking } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { supabase } from "../../../../services/supabase";
import { MaterialIcons } from "@expo/vector-icons";
import AppHeader from "../../../../components/AppHeader";

type Promoter = {
  id: string;
  full_name: string;
  shop_name: string | null;
  phone_number: string | null;
  email: string;
  is_active: boolean;
  upi_id: string | null;
  gpay_number: string | null;
};

type Sale = {
  id: string;
  product_name: string;
  bill_amount: string;
  status: string;
  created_at: string;
};

export default function PromoterDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [promoter, setPromoter] = useState<Promoter | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchPromoterData();
    }
  }, [id]);

  const fetchPromoterData = async () => {
    try {
      // Fetch promoter info
      const { data: promoterData, error: promoterError } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .single();

      if (promoterError) throw promoterError;
      setPromoter(promoterData);

      // Fetch promoter sales
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select("id, product_name, bill_amount, status, created_at")
        .eq("promoter_id", id)
        .order("created_at", { ascending: false });

      if (salesError) throw salesError;
      setSales(salesData || []);
    } catch (error) {
      console.error("Error fetching promoter data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phone: string | null) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  if (!promoter) {
    return (
      <View style={styles.center}>
        <Text>Promoter not found.</Text>
      </View>
    );
  }

  const renderSale = ({ item }: { item: Sale }) => (
    <TouchableOpacity 
      style={styles.saleCard}
      onPress={() => router.push(`/approver/sale/${item.id}`)}
    >
      <View style={styles.saleInfo}>
        <Text style={styles.productName}>{item.product_name}</Text>
        <Text style={styles.saleDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <View style={styles.saleRight}>
        <Text style={styles.amount}>₹{item.bill_amount}</Text>
        <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
          <Text style={[styles.statusText, getStatusTextStyle(item.status)]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Promoter Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{promoter.full_name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{promoter.full_name}</Text>
          <Text style={styles.shop}>{promoter.shop_name || "No shop name"}</Text>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <MaterialIcons name="email" size={16} color="#64748b" />
              <Text style={styles.infoText}>{promoter.email}</Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialIcons name="phone" size={16} color="#64748b" />
              <Text style={styles.infoText}>{promoter.phone_number || "N/A"}</Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialIcons name="payments" size={16} color="#64748b" />
              <Text style={styles.infoText}>UPI: {promoter.upi_id || "N/A"}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.callBtn} onPress={() => handleCall(promoter.phone_number)}>
              <MaterialIcons name="call" size={20} color="#fff" />
              <Text style={styles.btnText}>Call Promoter</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sales List Section */}
        <View style={styles.salesSection}>
          <Text style={styles.sectionTitle}>Recent Sales</Text>
          {sales.length > 0 ? (
            sales.map((item) => (
              <React.Fragment key={item.id}>
                {renderSale({ item })}
              </React.Fragment>
            ))
          ) : (
            <View style={styles.emptySales}>
              <MaterialIcons name="receipt-long" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No sales recorded for this promoter.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const getStatusStyle = (status: string) => {
  switch (status) {
    case "approved": return { backgroundColor: "#e8f5e9" };
    case "paid": return { backgroundColor: "#e3f2fd" };
    case "rejected": return { backgroundColor: "#ffebee" };
    default: return { backgroundColor: "#fff3e0" };
  }
};

const getStatusTextStyle = (status: string) => {
  switch (status) {
    case "approved": return { color: "#2e7d32" };
    case "paid": return { color: "#1565c0" };
    case "rejected": return { color: "#c62828" };
    default: return { color: "#ef6c00" };
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, paddingBottom: 100 },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarText: { fontSize: 32, fontWeight: "bold", color: "#2563eb" },
  name: { fontSize: 22, fontWeight: "bold", color: "#0f172a" },
  shop: { fontSize: 16, color: "#64748b", marginTop: 4 },
  infoGrid: { width: "100%", marginTop: 24, gap: 12 },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoText: { fontSize: 14, color: "#475569" },
  actions: { width: "100%", marginTop: 24 },
  callBtn: {
    backgroundColor: "#22c55e",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  salesSection: { marginTop: 32 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#0f172a", marginBottom: 16 },
  saleCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  saleInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: "600", color: "#1e293b" },
  saleDate: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  saleRight: { alignItems: "flex-end" },
  amount: { fontSize: 16, fontWeight: "bold", color: "#0f172a" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 4 },
  statusText: { fontSize: 10, fontWeight: "bold" },
  emptySales: { alignItems: "center", justifyContent: "center", marginTop: 40 },
  emptyText: { marginTop: 12, fontSize: 14, color: "#94a3b8", textAlign: "center" },
});
