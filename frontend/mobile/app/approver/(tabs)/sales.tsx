import React, { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from "react-native";
import { supabase } from "../../../services/supabase";
import { useRouter, useFocusEffect } from "expo-router";

type Sale = {
  id: string;
  promoter_email: string;
  product_name: string;
  model_no: string | null;
  serial_no: string | null;
  bill_no: string | null;
  bill_amount: string;
  status: string;
  created_at: string;
};

export default function ApproverSales() {
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSales = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: promoters, error: promotersError } = await supabase
        .from("users")
        .select("id")
        .eq("role", "promoter")
        .eq("approver_id", user.id)
        .eq("is_active", true);

      if (promotersError) throw promotersError;
      const promoterIds = (promoters || []).map((p: any) => p.id);

      if (promoterIds.length === 0) {
        setSales([]);
        return;
      }

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
        .in("promoter_id", promoterIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mappedSales = (data || []).map((sale: any) => ({
        ...sale,
        promoter_email: sale.promoter?.email || "Unknown",
      }));

      setSales(mappedSales);
    } catch (error) {
      console.error("Failed to fetch approver sales", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSales();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchSales();
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
        return "#888";
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sales}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No sales found for review.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/approver/sale/${item.id}`)}
            delayPressIn={100}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.productName}>{item.product_name}</Text>
                {item.model_no && <Text style={styles.metaText}>Model: {item.model_no}</Text>}
                {item.serial_no && <Text style={styles.metaText}>Serial: {item.serial_no}</Text>}
                {item.bill_no && <Text style={styles.metaText}>Bill: {item.bill_no}</Text>}
              </View>
              <Text style={styles.billAmount}>₹{item.bill_amount}</Text>
            </View>

            <Text style={styles.promoterEmail}>{item.promoter_email}</Text>

            <View style={styles.detailsRow}>
              <View>
                <Text style={styles.label}>Status</Text>
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                  {item.status.replace("_", " ").toUpperCase()}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.label}>Date</Text>
                <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
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
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginTop: 15,
    padding: 15,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  productName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  metaText: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  billAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1976d2",
  },
  promoterEmail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 10,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 12,
    color: "#888",
    marginBottom: 2,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#888",
  },
});

