import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import api from "../../services/api";
import { useFocusEffect } from "expo-router";

type Sale = {
    id: number;
    product_name: string;
    bill_no: string | null;
    bill_amount: string;
    status: string;
    incentive_amount: string | null;
    payment_status: string;
    created_at: string;
};

export default function MySales() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchSales = async () => {
        try {
            const res = await api.get("/sales/my-sales/");
            setSales(res.data);
        } catch (error) {
            console.error("Failed to fetch my sales", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Ensure sales update when tab is focused
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
            case "approved": return "#4caf50";
            case "rejected": return "#f44336";
            case "pending": return "#ff9800";
            default: return "#888";
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
                keyExtractor={(item) => item.id.toString()}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>You haven't uploaded any sales yet.</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View>
                                <Text style={styles.productName}>{item.product_name}</Text>
                                {item.bill_no && <Text style={styles.billNoText}>Bill: {item.bill_no}</Text>}
                            </View>
                            <Text style={styles.billAmount}>₹{item.bill_amount}</Text>
                        </View>

                        <View style={styles.detailsRow}>
                            <View>
                                <Text style={styles.label}>Status</Text>
                                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                                    {item.status.toUpperCase()}
                                </Text>
                            </View>
                            <View style={{ alignItems: "flex-end" }}>
                                <Text style={styles.label}>Incentive</Text>
                                <Text style={styles.incentiveText}>
                                    {item.incentive_amount ? `₹${item.incentive_amount}` : "Pending"}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.footerRow}>
                            <Text style={styles.dateText}>
                                {new Date(item.created_at).toLocaleDateString()}
                            </Text>
                            <Text style={styles.paymentStatus}>
                                Payment: <Text style={{ fontWeight: "bold" }}>{item.payment_status}</Text>
                            </Text>
                        </View>
                    </View>
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
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        paddingBottom: 10,
        marginBottom: 10,
    },
    productName: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
    },
    billNoText: {
        fontSize: 14,
        color: "#666",
        marginTop: 2,
    },
    billAmount: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1976d2",
    },
    detailsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    label: {
        fontSize: 12,
        color: "#666",
        marginBottom: 2,
    },
    statusText: {
        fontSize: 14,
        fontWeight: "bold",
    },
    incentiveText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#333",
    },
    footerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "#eee",
    },
    dateText: {
        fontSize: 12,
        color: "#888",
    },
    paymentStatus: {
        fontSize: 12,
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
