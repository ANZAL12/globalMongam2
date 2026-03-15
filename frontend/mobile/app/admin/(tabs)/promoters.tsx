import React, { useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "../../../services/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from 'react-native';

const safeStorage = {
    getItem: async (key: string) => {
        if (Platform.OS === 'web') {
            return localStorage.getItem(key);
        }
        return await AsyncStorage.getItem(key);
    }
};

interface Promoter {
    id: string; // UUID
    email: string;
    shop_name: string;
    full_name: string;
    phone_number: string;
    gpay_number: string;
    is_active: boolean;
    date_joined: string;
}

export default function Promoters() {
    const router = useRouter();
    const [promoters, setPromoters] = useState<Promoter[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchPromoters = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'promoter')
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            // Map created_at to date_joined to match interface if needed
            const mappedPromoters = (data || []).map((p: any) => ({
                ...p,
                date_joined: p.created_at,
                // Supabase doesn't have is_active by default on users, let's assume true or handle if added
                is_active: p.is_active !== undefined ? p.is_active : true
            }));

            setPromoters(mappedPromoters);
        } catch (error: any) {
            console.error("Error fetching promoters:", error);
            Alert.alert("Error", "Failed to fetch promoters list.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchPromoters();
        }, [])
    );

    const handleRefresh = () => {
        setRefreshing(true);
        fetchPromoters();
    };

    const renderPromoterItem = ({ item }: { item: Promoter }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/admin/promoter/${item.id}` as any)}
            activeOpacity={0.7}
            delayPressIn={100}
        >
            <View style={styles.cardHeader}>
                <View style={styles.avatarContainer}>
                    <MaterialIcons name="person" size={32} color="#1976d2" />
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.fullName}>{item.full_name || "No Name Provided"}</Text>
                    <Text style={styles.shopName}>{item.shop_name || "N/A"}</Text>
                </View>
                <View style={[styles.badge, item.is_active ? styles.activeBadge : styles.inactiveBadge]}>
                    <Text style={styles.badgeText}>{item.is_active ? "Active" : "Inactive"}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#ccc" />
            </View>

            <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                    <MaterialIcons name="email" size={18} color="#666" />
                    <Text style={styles.infoText}>{item.email}</Text>
                </View>
                <View style={styles.infoRow}>
                    <MaterialIcons name="phone" size={18} color="#666" />
                    <Text style={styles.infoText}>{item.phone_number || "N/A"}</Text>
                </View>
                {item.gpay_number ? (
                    <View style={styles.infoRow}>
                        <MaterialIcons name="payment" size={18} color="#666" />
                        <Text style={styles.infoText}>GPay: {item.gpay_number}</Text>
                    </View>
                ) : null}
            </View>
            <View style={styles.cardFooter}>
                <Text style={styles.date}>Joined: {new Date(item.date_joined).toLocaleDateString()}</Text>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#1976d2" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={promoters}
                keyExtractor={(item) => item.id}
                renderItem={renderPromoterItem}
                contentContainerStyle={styles.listContainer}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                ListHeaderComponent={<Text style={styles.title}>Registered Promoters</Text>}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="people-outline" size={64} color="#ccc" />
                        <Text style={styles.emptyText}>No promoters found.</Text>
                    </View>
                }
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
    listContainer: {
        padding: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 20,
        color: "#333",
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#e3f2fd",
        justifyContent: "center",
        alignItems: "center",
    },
    headerText: {
        flex: 1,
        marginLeft: 15,
    },
    fullName: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
    },
    shopName: {
        fontSize: 14,
        color: "#666",
        marginTop: 2,
    },
    cardBody: {
        paddingVertical: 10,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 5,
    },
    infoText: {
        marginLeft: 10,
        fontSize: 14,
        color: "#444",
    },
    email: {
        fontSize: 14,
        color: "#666",
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
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
        color: "#2e7d32",
    },
    cardFooter: {
        borderTopWidth: 1,
        borderTopColor: "#f0f0f0",
        paddingTop: 10,
        flexDirection: "row",
        justifyContent: "flex-end",
    },
    date: {
        fontSize: 12,
        color: "#999",
    },
    emptyContainer: {
        alignItems: "center",
        marginTop: 100,
    },
    emptyText: {
        fontSize: 18,
        color: "#999",
        marginTop: 10,
    },
});
