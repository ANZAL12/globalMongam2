import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Linking } from "react-native";
import { supabase } from "../../../services/supabase";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../../context/AuthContext";

type Promoter = {
  id: string;
  full_name: string;
  shop_name: string | null;
  phone_number: string | null;
  email: string;
  is_active: boolean;
};

export default function MyPromoters() {
  const router = useRouter();
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPromoters();
  }, []);

  const fetchPromoters = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, shop_name, phone_number, email, is_active")
        .eq("approver_id", user.id)
        .eq("role", "promoter")
        .order("full_name", { ascending: true });

      if (error) throw error;
      setPromoters(data || []);
    } catch (error) {
      console.error("Failed to fetch promoters", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCall = (phone: string | null) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const renderPromoter = ({ item }: { item: Promoter }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => router.push(`/approver/promoter/${item.id}`)}
      delayPressIn={100}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.full_name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{item.full_name}</Text>
          <Text style={styles.shop}>{item.shop_name || "No shop name"}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.is_active ? "#e8f5e9" : "#ffebee" }]}>
          <Text style={[styles.statusText, { color: item.is_active ? "#2e7d32" : "#c62828" }]}>
            {item.is_active ? "ACTIVE" : "INACTIVE"}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.contactRow}>
        <View style={styles.contactItem}>
          <MaterialIcons name="email" size={16} color="#64748b" />
          <Text style={styles.contactText}>{item.email}</Text>
        </View>
        {item.phone_number && (
          <TouchableOpacity style={styles.callButton} onPress={() => handleCall(item.phone_number)}>
            <MaterialIcons name="call" size={18} color="#fff" />
            <Text style={styles.callButtonText}>Call</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Promoters</Text>
        <Text style={styles.subtitle}>List of promoters assigned to you.</Text>
      </View>

      <FlatList
        data={promoters}
        keyExtractor={(item) => item.id}
        renderItem={renderPromoter}
        contentContainerStyle={styles.list}
        onRefresh={() => {
          setRefreshing(true);
          fetchPromoters();
        }}
        refreshing={refreshing}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="people-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>No promoters found under your account.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2563eb",
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
  },
  shop: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 12,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  contactText: {
    fontSize: 13,
    color: "#64748b",
    marginLeft: 6,
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#22c55e",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  callButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#94a3b8",
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
