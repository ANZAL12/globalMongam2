import React, { useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, Alert, TouchableOpacity } from "react-native";
import { supabase } from "../../../services/supabase";
import { useFocusEffect } from "expo-router";
import { Ionicons } from '@expo/vector-icons';

type Sale = {
    id: string;
    product_name: string;
    model_no: string | null;
    serial_no: string | null;
    bill_no: string | null;
    bill_amount: string;
    status: string;
    incentive_amount: string | null;
    payment_status: string;
    created_at: string;
    transaction_id?: string | null;
    approved_by_email?: string | null;
    paid_by_email?: string | null;
};

export default function MySales() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchSales = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('sales')
                .select('id, product_name, model_no, serial_no, bill_no, bill_amount, status, incentive_amount, payment_status, created_at, transaction_id, approved_by_email, paid_by_email')
                .eq('promoter_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSales(data || []);
        } catch (error) {
            console.error("Failed to fetch my sales", error);
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

    const handleDeleteSale = (saleId: string) => {
        Alert.alert(
            "Delete Sale",
            "Are you sure you want to delete this sale?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await supabase.from('sales').delete().eq('id', saleId);
                            if (error) throw error;
                            
                            // Refresh list
                            fetchSales();
                        } catch (error: any) {
                            Alert.alert("Error", error.message || "Failed to delete sale.");
                        }
                    }
                }
            ]
        );
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
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>You haven't uploaded any sales yet.</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.productName}>{item.product_name}</Text>
                                {item.model_no && <Text style={styles.billNoText}>Model: {item.model_no}</Text>}
                                {item.bill_no && <Text style={styles.billNoText}>Bill: {item.bill_no}</Text>}
                            </View>
                            <View style={{ alignItems: "flex-end" }}>
                                <Text style={styles.billAmount}>₹{item.bill_amount}</Text>
                                {(item.status === 'pending' || item.status === 'rejected') && (
                                    <TouchableOpacity 
                                        style={styles.deleteButton} 
                                        onPress={() => handleDeleteSale(item.id)}
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#f44336" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        <View style={styles.detailsRow}>
                            <View>
                                <Text style={styles.label}>Status</Text>
                                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                                    {item.status.toUpperCase()}
                                </Text>
                                {item.approved_by_email ? (
                                    <Text style={styles.adminEmail}>By: {item.approved_by_email}</Text>
                                ) : null}
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
                            <View style={{ alignItems: "flex-end" }}>
                                <Text style={styles.paymentStatus}>
                                    Payment: <Text style={{ fontWeight: "bold" }}>{item.payment_status}</Text>
                                </Text>
                                {item.paid_by_email ? (
                                    <Text style={styles.adminEmail}>By: {item.paid_by_email}</Text>
                                ) : null}
                                {item.transaction_id ? (
                                    <Text style={styles.txnText}>Txn ID: {item.transaction_id}</Text>
                                ) : null}
                            </View>
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
    deleteButton: {
        marginTop: 10,
        padding: 5,
        backgroundColor: "#ffebee",
        borderRadius: 20,
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
    txnText: {
        fontSize: 11,
        color: "#1976d2",
        fontWeight: "bold",
        marginTop: 2,
    },
    adminEmail: {
        fontSize: 10,
        color: "#1976d2",
        fontStyle: "italic",
        marginTop: 2,
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
