import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { supabase } from "../../../services/supabase";

type Sale = {
    id: string;
    status: string;
    incentive_amount: string | null;
};

export default function PromoterDashboard() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('sales')
                .select('id, status, incentive_amount')
                .eq('promoter_id', user.id);

            if (error) throw error;
            setSales(data || []);
        } catch (error) {
            console.error("Failed to fetch sales for dashboard", error);
        } finally {
            setLoading(false);
        }
    };

    const totalSalesCount = sales.length;
    const approvedSales = sales.filter((s) => s.status === "approved" || s.status === "paid");
    const approvedCount = approvedSales.length;
    const pendingCount = sales.filter((s) => s.status === "pending").length;

    const totalIncentive = approvedSales.reduce((sum, sale) => {
        return sum + (sale.incentive_amount ? parseFloat(sale.incentive_amount) : 0);
    }, 0);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#1976d2" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Welcome to your Dashboard</Text>

            <View style={styles.cardContainer}>
                <View style={[styles.card, { borderLeftColor: "#1976d2" }]}>
                    <Text style={styles.cardTitle}>Total Sales</Text>
                    <Text style={styles.cardValue}>{totalSalesCount}</Text>
                </View>

                <View style={[styles.card, { borderLeftColor: "#4caf50" }]}>
                    <Text style={styles.cardTitle}>Approved</Text>
                    <Text style={styles.cardValue}>{approvedCount}</Text>
                </View>

                <View style={[styles.card, { borderLeftColor: "#ff9800" }]}>
                    <Text style={styles.cardTitle}>Pending</Text>
                    <Text style={styles.cardValue}>{pendingCount}</Text>
                </View>

                <View style={[styles.card, { borderLeftColor: "#9c27b0" }]}>
                    <Text style={styles.cardTitle}>Total Incentive</Text>
                    <Text style={styles.cardValue}>₹{totalIncentive.toFixed(2)}</Text>
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
