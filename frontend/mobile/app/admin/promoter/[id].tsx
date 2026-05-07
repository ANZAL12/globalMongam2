import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView, TouchableOpacity, FlatList, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { supabase } from "../../../services/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

const safeStorage = {
    getItem: async (key: string) => {
        if (Platform.OS === 'web') {
            return localStorage.getItem(key);
        }
        return await AsyncStorage.getItem(key);
    }
};

interface Sale {
    id: string; // UUID
    product_name: string;
    model_no: string | null;
    serial_no: string | null;
    bill_amount: string;
    status: string;
    incentive_amount: string;
    payment_status: string;
    created_at: string;
}

interface PromoterDetail {
    id: string; // UUID
    email: string;
    shop_name: string;
    full_name: string;
    phone_number: string;
    gpay_number: string;
    is_active: boolean;
    date_joined: string;
    sales_history: Sale[];
}

export default function PromoterDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [promoter, setPromoter] = useState<PromoterDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);

    const fetchPromoterDetail = async () => {
        try {
            // Fetch Promoter User Details
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .single();

            if (userError) throw userError;

            // Fetch Promoter Sales
            const { data: salesData, error: salesError } = await supabase
                .from('sales')
                .select('*')
                .eq('promoter_id', id)
                .order('created_at', { ascending: false });

            if (salesError) throw salesError;

            const mappedPromoter: PromoterDetail = {
                ...userData,
                date_joined: userData.created_at,
                // Supabase users table might not have is_active explicitly mapped yet, default to true if missing
                is_active: userData.is_active !== undefined ? userData.is_active : true,
                sales_history: salesData || []
            };

            setPromoter(mappedPromoter);
        } catch (error: any) {
            console.error("Error fetching promoter detail:", error);
            Alert.alert("Error", "Failed to load promoter details.");
        } finally {
            setLoading(false);
        }
    };

    const togglePromoterStatus = async () => {
        if (!promoter) return;
        Alert.alert(
            "Confirm Action",
            `Are you sure you want to ${promoter.is_active ? 'disable' : 'enable'} this account?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: promoter.is_active ? "Disable Account" : "Enable Account",
                    style: promoter.is_active ? "destructive" : "default",
                    onPress: async () => {
                        setToggling(true);
                        try {
                            const newStatus = !promoter.is_active;
                            const { error } = await supabase
                                .from('users')
                                .update({ is_active: newStatus })
                                .eq('id', id);

                            if (error) throw error;

                            setPromoter({ ...promoter, is_active: newStatus });
                            Alert.alert("Success", `Promoter account has been ${newStatus ? 'enabled' : 'disabled'}.`);
                        } catch (error: any) {
                            console.error("Error toggling status:", error);
                            Alert.alert("Error", "Failed to update promoter status.");
                        } finally {
                            setToggling(false);
                        }
                    }
                }
            ]
        );
    };

    useEffect(() => {
        fetchPromoterDetail();
    }, [id]);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#1976d2" />
            </View>
        );
    }

    if (!promoter) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>Promoter not found.</Text>
            </View>
        );
    }

    const renderIncentiveItem = ({ item }: { item: Sale }) => (
        <TouchableOpacity
            style={styles.incentiveCard}
            onPress={() => router.push(`/admin/sale/${item.id}` as any)}
            activeOpacity={0.7}
        >
            <View style={styles.incentiveHeader}>
                <View>
                    <Text style={styles.productName}>{item.product_name}</Text>
                    {item.model_no && <Text style={{ fontSize: 12, color: "#666", marginTop: 2 }}>Model: {item.model_no}</Text>}
                    {item.serial_no && <Text style={{ fontSize: 12, color: "#666", marginTop: 2 }}>Serial: {item.serial_no}</Text>}
                </View>
                <View style={styles.headerRightAction}>
                    <View style={[styles.statusBadge, item.status === 'approved' ? styles.approvedBadge : item.status === 'rejected' ? styles.rejectedBadge : styles.pendingBadge]}>
                        <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color="#ccc" />
                </View>
            </View>
            <View style={styles.incentiveBody}>
                <View style={styles.row}>
                    <Text style={styles.label}>Bill Amount:</Text>
                    <Text style={styles.value}>₹{item.bill_amount}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Incentive Rewarded:</Text>
                    <Text style={[styles.value, styles.incentiveValue]}>₹{item.incentive_amount || "0.00"}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Payment Status:</Text>
                    <View style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                        <Text style={[styles.value, item.payment_status === 'paid' ? styles.paidText : styles.unpaidText]}>
                            {item.payment_status.toUpperCase()}
                        </Text>
                        {item.payment_status === 'paid' && item.paid_at && (
                            <Text style={[styles.dateText, { textAlign: 'right', marginTop: 2, fontSize: 12 }]}>
                                {new Date(item.paid_at).toLocaleDateString()}
                            </Text>
                        )}
                    </View>
                </View>
            </View>
            <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Promoter Profile</Text>
            </View>

            <FlatList
                data={promoter.sales_history}
                keyExtractor={(item) => item.id}
                renderItem={renderIncentiveItem}
                ListHeaderComponent={
                    <View style={styles.profileSection}>
                        <View style={styles.profileCard}>
                            <View style={styles.headerRow}>
                                <View style={[styles.badge, promoter.is_active ? styles.activeBadge : styles.inactiveBadge]}>
                                    <Text style={styles.badgeText}>{promoter.is_active ? "Account Active" : "Account Disabled"}</Text>
                                </View>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, promoter.is_active ? styles.disableBtn : styles.enableBtn]}
                                    onPress={togglePromoterStatus}
                                    disabled={toggling}
                                >
                                    {toggling ? <ActivityIndicator size="small" color="#fff" /> :
                                        <Text style={styles.toggleBtnText}>{promoter.is_active ? "Disable" : "Enable"}</Text>}
                                </TouchableOpacity>
                            </View>

                            <View style={styles.adminAvatar}>
                                <MaterialIcons name="person" size={40} color="#1976d2" />
                            </View>
                            <Text style={styles.detailName}>{promoter.full_name || "No Name Provided"}</Text>
                            <Text style={styles.detailShop}>{promoter.shop_name || "N/A"}</Text>

                            <View style={styles.infoGrid}>
                                <View style={styles.infoItem}>
                                    <MaterialIcons name="email" size={20} color="#666" />
                                    <Text style={styles.infoValue}>{promoter.email}</Text>
                                </View>
                                <View style={styles.infoItem}>
                                    <MaterialIcons name="phone" size={20} color="#666" />
                                    <Text style={styles.infoValue}>{promoter.phone_number || "N/A"}</Text>
                                </View>
                                <View style={styles.infoItem}>
                                    <MaterialIcons name="payment" size={20} color="#666" />
                                    <Text style={styles.infoValue}>GPay: {promoter.gpay_number || "N/A"}</Text>
                                </View>
                                <View style={styles.infoItem}>
                                    <MaterialIcons name="event" size={20} color="#666" />
                                    <Text style={styles.infoValue}>Joined: {new Date(promoter.date_joined).toLocaleDateString()}</Text>
                                </View>
                            </View>
                        </View>
                        <Text style={styles.historyTitle}>Incentives & Rewards History</Text>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyHistory}>
                        <MaterialIcons name="history" size={48} color="#ccc" />
                        <Text style={styles.emptyText}>No incentives recorded yet.</Text>
                    </View>
                }
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        backgroundColor: "#1976d2",
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: "row",
        alignItems: "center",
    },
    backButton: {
        marginRight: 15,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#fff",
    },
    profileSection: {
        padding: 20,
    },
    profileCard: {
        backgroundColor: "#fff",
        borderRadius: 15,
        padding: 20,
        alignItems: "center",
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    adminAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#e3f2fd",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 15,
    },
    detailName: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#333",
    },
    detailShop: {
        fontSize: 16,
        color: "#666",
        marginBottom: 20,
    },
    infoGrid: {
        width: "100%",
        borderTopWidth: 1,
        borderTopColor: "#f0f0f0",
        paddingTop: 20,
    },
    infoItem: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    infoValue: {
        marginLeft: 12,
        fontSize: 15,
        color: "#444",
    },
    historyTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        marginTop: 30,
        marginBottom: 15,
    },
    listContent: {
        paddingBottom: 30,
    },
    incentiveCard: {
        backgroundColor: "#fff",
        marginHorizontal: 20,
        marginBottom: 15,
        borderRadius: 12,
        padding: 15,
        elevation: 2,
    },
    incentiveHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
        paddingBottom: 10,
    },
    headerRightAction: {
        flexDirection: "row",
        alignItems: "center",
    },
    productName: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 5,
    },
    pendingBadge: { backgroundColor: "#fff3e0" },
    approvedBadge: { backgroundColor: "#e8f5e9" },
    rejectedBadge: { backgroundColor: "#ffebee" },
    statusText: {
        fontSize: 10,
        fontWeight: "bold",
        color: "#555",
    },
    incentiveBody: {
        marginBottom: 10,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 5,
    },
    label: {
        fontSize: 14,
        color: "#777",
    },
    value: {
        fontSize: 14,
        fontWeight: "500",
        color: "#333",
    },
    incentiveValue: {
        color: "#2e7d32",
        fontWeight: "bold",
    },
    paidText: { color: "#2e7d32" },
    unpaidText: { color: "#d32f2f" },
    dateText: {
        fontSize: 11,
        color: "#999",
        textAlign: "right",
    },
    emptyHistory: {
        alignItems: "center",
        marginTop: 50,
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 16,
        color: "#999",
        marginTop: 10,
        textAlign: "center",
    },
    errorText: {
        fontSize: 18,
        color: "#d32f2f",
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: 10,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    activeBadge: {
        backgroundColor: "#e8f5e9",
    },
    inactiveBadge: {
        backgroundColor: "#ffebee",
    },
    badgeText: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#333",
    },
    toggleBtn: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 8,
    },
    disableBtn: {
        backgroundColor: "#d32f2f",
    },
    enableBtn: {
        backgroundColor: "#2e7d32",
    },
    toggleBtnText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 12,
    }
});
