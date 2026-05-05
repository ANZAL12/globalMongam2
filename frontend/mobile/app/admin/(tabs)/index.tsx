import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from "react-native";
import { supabase } from "../../../services/supabase";
import { useFocusEffect } from "expo-router";

type Sale = {
    id: string; // UUID
    status: string;
    payment_status: string;
};

export default function AdminDashboard() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchSales = async () => {
        try {
            const { data, error } = await supabase.from('sales').select('id, status, payment_status');
            if (error) throw error;
            setSales(data || []);
        } catch (error) {
            console.error("Failed to fetch all sales", error);
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

    const totalSalesCount = sales.length;
    const pendingCount = sales.filter((s) => s.status === "pending").length;
    const approverApprovedCount = sales.filter((s) => s.status === "approver_approved").length;
    const paidCount = sales.filter((s) => s.payment_status === "paid").length;

    if (loading && !refreshing) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#1976d2" />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <Text style={styles.title}>Admin Overview</Text>

            <View style={styles.cardContainer}>
                <View style={[styles.card, { borderLeftColor: "#1976d2" }]}>
                    <Text style={styles.cardTitle}>Total Sales Submitted</Text>
                    <Text style={styles.cardValue}>{totalSalesCount}</Text>
                </View>

                <View style={[styles.card, { borderLeftColor: "#ff9800" }]}>
                    <Text style={styles.cardTitle}>Waiting for Approver</Text>
                    <Text style={styles.cardValue}>{pendingCount}</Text>
                </View>

                <View style={[styles.card, { borderLeftColor: "#4caf50" }]}>
                    <Text style={styles.cardTitle}>Approved by Approver</Text>
                    <Text style={styles.cardValue}>{approverApprovedCount}</Text>
                </View>

                <View style={[styles.card, { borderLeftColor: "#9c27b0" }]}>
                    <Text style={styles.cardTitle}>Incentives Paid</Text>
                    <Text style={styles.cardValue}>{paidCount}</Text>
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
