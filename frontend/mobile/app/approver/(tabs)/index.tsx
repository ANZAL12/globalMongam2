import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from "react-native";
import { supabase } from "../../../services/supabase";
import { useFocusEffect } from "expo-router";

type Sale = {
  id: string;
  status: string;
};

export default function ApproverDashboard() {
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

      const { data, error } = await supabase.from("sales").select("id, status").in("promoter_id", promoterIds);
      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error("Failed to fetch sales for approver dashboard", error);
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

  const totalCount = sales.length;
  const pendingCount = sales.filter((s) => s.status === "pending").length;
  const approvedByYouCount = sales.filter((s) => s.status === "approver_approved").length;
  const rejectedCount = sales.filter((s) => s.status === "rejected").length;

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={styles.title}>Approver Overview</Text>

      <View style={styles.cardContainer}>
        <View style={[styles.card, { borderLeftColor: "#1976d2" }]}>
          <Text style={styles.cardTitle}>Assigned Sales</Text>
          <Text style={styles.cardValue}>{totalCount}</Text>
        </View>

        <View style={[styles.card, { borderLeftColor: "#ff9800" }]}>
          <Text style={styles.cardTitle}>Pending Review</Text>
          <Text style={styles.cardValue}>{pendingCount}</Text>
        </View>

        <View style={[styles.card, { borderLeftColor: "#4caf50" }]}>
          <Text style={styles.cardTitle}>Approved by You</Text>
          <Text style={styles.cardValue}>{approvedByYouCount}</Text>
        </View>

        <View style={[styles.card, { borderLeftColor: "#f44336" }]}>
          <Text style={styles.cardTitle}>Rejected</Text>
          <Text style={styles.cardValue}>{rejectedCount}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  cardContainer: {
    gap: 15,
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    borderLeftWidth: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 5,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
});

