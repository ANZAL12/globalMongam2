import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from "react-native";
import { supabase } from "../../../services/supabase";
import { useRouter, useFocusEffect } from "expo-router";

type Sale = {
    id: string; // UUID
    promoter_email: string;
    product_name: string;
    model_no: string | null;
    serial_no: string | null;
    bill_no: string | null;
    bill_amount: string;
    status: string;
    incentive_amount: string | null;
    payment_status: string;
    created_at: string;
};

export default function AllSales() {
    const router = useRouter();
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<"awaiting_approver" | "ready_to_pay" | "paid">("ready_to_pay");

    const fetchSales = async () => {
        try {
            const { data, error } = await supabase
                .from('sales')
                .select(`
                    *,
                    promoter:users!sales_promoter_id_fkey (
                        email
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Map the data to fit the expected Sale type (extracting email from join)
            const mappedSales = (data || []).map((sale: any) => ({
                ...sale,
                promoter_email: sale.promoter?.email || 'Unknown',
            }));

            setSales(mappedSales);
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

    const awaitingApprover = sales.filter((s) => s.status === "pending");
    const readyToPay = sales.filter((s) => s.status === "approver_approved" && s.payment_status !== "paid");
    const paid = sales.filter((s) => s.payment_status === "paid");

    const filteredSales =
        activeTab === "awaiting_approver" ? awaitingApprover : activeTab === "paid" ? paid : readyToPay;

    const getStatusColor = (status: string) => {
        switch (status) {
            case "approver_approved": return "#4caf50";
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
            <View style={styles.segmentContainer}>
                <TouchableOpacity
                    style={[styles.segmentButton, activeTab === "awaiting_approver" && styles.segmentButtonActive]}
                    onPress={() => setActiveTab("awaiting_approver")}
                >
                    <Text style={[styles.segmentText, activeTab === "awaiting_approver" && styles.segmentTextActive]}>
                        Awaiting Approver ({awaitingApprover.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.segmentButton, activeTab === "ready_to_pay" && styles.segmentButtonActive]}
                    onPress={() => setActiveTab("ready_to_pay")}
                >
                    <Text style={[styles.segmentText, activeTab === "ready_to_pay" && styles.segmentTextActive]}>
                        Ready to Pay ({readyToPay.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.segmentButton, activeTab === "paid" && styles.segmentButtonActive]}
                    onPress={() => setActiveTab("paid")}
                >
                    <Text style={[styles.segmentText, activeTab === "paid" && styles.segmentTextActive]}>
                        Paid ({paid.length})
                    </Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredSales}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            {activeTab === "awaiting_approver"
                                ? "No sales are waiting for approver review."
                                : activeTab === "paid"
                                ? "No paid sales yet."
                                : "No sales are ready for payout yet."}
                        </Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => router.push(`/admin/sale/${item.id}`)}
                        delayPressIn={100}
                    >
                        <View style={styles.cardHeader}>
                            <View>
                                <Text style={styles.productName}>{item.product_name}</Text>
                                {item.model_no && <Text style={styles.billNoText}>Model: {item.model_no}</Text>}
                                {item.serial_no && <Text style={styles.billNoText}>Serial: {item.serial_no}</Text>}
                                {item.bill_no && <Text style={styles.billNoText}>Bill: {item.bill_no}</Text>}
                            </View>
                            <Text style={styles.billAmount}>₹{item.bill_amount}</Text>
                        </View>

                        <Text style={styles.promoterEmail}>{item.promoter_email}</Text>

                        <View style={styles.detailsRow}>
                            <View>
                                <Text style={styles.label}>Status</Text>
                                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                                    {item.status.toUpperCase()}
                                </Text>
                            </View>
                            <View style={{ alignItems: "flex-end" }}>
                                <Text style={styles.label}>Payment</Text>
                                <Text style={styles.paymentText}>
                                    {item.payment_status.toUpperCase()}
                                </Text>
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
    segmentContainer: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 15,
        paddingTop: 12,
        paddingBottom: 6,
    },
    segmentButton: {
        flex: 1,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    segmentButtonActive: {
        borderColor: "#1976d2",
        backgroundColor: "#e3f2fd",
    },
    segmentText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#555",
        textAlign: "center",
    },
    segmentTextActive: {
        color: "#1976d2",
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
    paymentText: {
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
