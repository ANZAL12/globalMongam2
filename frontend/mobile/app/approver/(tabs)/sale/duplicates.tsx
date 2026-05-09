import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { supabase } from "../../../../services/supabase";
import { useAuth } from "../../../../context/AuthContext";

type DuplicateSale = {
  id: string;
  product_name: string;
  model_no: string | null;
  serial_no: string | null;
  bill_no: string | null;
  bill_amount: string;
  status: string;
  created_at: string;
  promoter?: {
    email?: string | null;
  } | null;
};

export default function DuplicateSerialSalesScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const { serial, currentSaleId } = useLocalSearchParams<{
    serial?: string;
    currentSaleId?: string;
  }>();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<DuplicateSale[]>([]);

  const normalizeSerial = (value: string | null | undefined) => value?.trim().toLowerCase() || "";
  const serialValue = typeof serial === "string" ? serial : "";
  const serialKey = normalizeSerial(serialValue);

  useEffect(() => {
    fetchMatchingSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialValue]);

  const fetchMatchingSales = async () => {
    if (!serialKey) {
      setSales([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sales")
        .select(
          `
          id,
          product_name,
          model_no,
          serial_no,
          bill_no,
          bill_amount,
          status,
          created_at,
          promoter:users!promoter_id (
            email
          )
        `
        )
        .ilike("serial_no", serialValue.trim())
        .order("created_at", { ascending: false });

      if (error) throw error;

      const exactMatches = (data || []).filter((sale: any) => normalizeSerial(sale.serial_no) === serialKey);
      setSales(exactMatches as DuplicateSale[]);
    } catch (error) {
      console.error("Failed to fetch duplicate serial sales:", error);
      setSales([]);
    } finally {
      setLoading(false);
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

  return (
    <View style={styles.container}>
      <View style={styles.contentHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Duplicate Serial Sales</Text>
          <Text style={styles.headerSubtitle}>Serial: {serialValue || "N/A"}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1976d2" />
        </View>
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(item) => item.id}
          contentContainerStyle={sales.length === 0 ? styles.emptyContainer : styles.listContainer}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No matching sales found.</Text>
          }
          renderItem={({ item }) => {
            const isCurrentSale = typeof currentSaleId === "string" && currentSaleId === item.id;
            return (
              <TouchableOpacity
                style={[styles.card, isCurrentSale ? styles.currentSaleCard : null]}
                onPress={() => router.push(`/approver/sale/${item.id}`)}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.productName}>{item.product_name}</Text>
                  <Text style={styles.amount}>₹{item.bill_amount}</Text>
                </View>
                <Text style={styles.metaText}>Promoter: {item.promoter?.email || "Unknown"}</Text>
                <Text style={styles.metaText}>Bill: {item.bill_no || "N/A"}</Text>
                <Text style={styles.metaText}>Date: {new Date(item.created_at).toLocaleDateString()}</Text>
                <View style={styles.footerRow}>
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {item.status.replace("_", " ").toUpperCase()}
                  </Text>
                  {isCurrentSale ? <Text style={styles.currentSaleText}>Current Sale</Text> : null}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 15,
  },
  contentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    paddingBottom: 16,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#888",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  currentSaleCard: {
    borderColor: "#1976d2",
    borderWidth: 2,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    flex: 1,
    paddingRight: 10,
  },
  amount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1976d2",
  },
  metaText: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  footerRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  currentSaleText: {
    fontSize: 11,
    color: "#1976d2",
    fontWeight: "700",
    textTransform: "uppercase",
  },
});
