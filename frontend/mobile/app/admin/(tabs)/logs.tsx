import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { supabase } from "../../../services/supabase";
import { useFocusEffect } from "expo-router";

type LogEntry = {
    id: number;
    action_time: string;
    username: string; // This is the user email as per our serializer
    content_type_id: number;
    object_id: string;
    object_repr: string;
    action_flag: number;
    change_message: string;
};

export default function AdminLogs() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchLogs = async () => {
        try {
            // Supabase does not have a direct equivalent to Django admin logs.
            // For a real app, you would query a dedicated 'activity_logs' table.
            setLogs([]);
        } catch (error) {
            console.error("Failed to fetch admin logs", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchLogs();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchLogs();
    };

    const getActionType = (flag: number) => {
        switch (flag) {
            case 1: return { label: "ADDITION", color: "#4caf50", bgColor: "#e8f5e9" };
            case 2: return { label: "CHANGE", color: "#2196f3", bgColor: "#e3f2fd" };
            case 3: return { label: "DELETION", color: "#f44336", bgColor: "#ffebee" };
            default: return { label: "UNKNOWN", color: "#757575", bgColor: "#f5f5f5" };
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString();
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
                data={logs}
                keyExtractor={(item) => item.id.toString()}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No activity logs found.</Text>
                    </View>
                }
                renderItem={({ item }) => {
                    const action = getActionType(item.action_flag);
                    return (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.timestamp}>{formatDate(item.action_time)}</Text>
                                <View style={[styles.badge, { backgroundColor: action.bgColor }]}>
                                    <Text style={[styles.badgeText, { color: action.color }]}>
                                        {action.label}
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.adminEmail}>{item.username}</Text>

                            <View style={styles.objectRow}>
                                <Text style={styles.label}>Object: </Text>
                                <Text style={styles.objectText}>{item.object_repr}</Text>
                            </View>

                            {item.change_message ? (
                                <View style={styles.messageRow}>
                                    <Text style={styles.label}>Message: </Text>
                                    <Text style={styles.messageText}>{item.change_message}</Text>
                                </View>
                            ) : null}
                        </View>
                    );
                }}
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
        alignItems: "center",
        marginBottom: 8,
    },
    timestamp: {
        fontSize: 12,
        color: "#888",
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: "bold",
    },
    adminEmail: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 8,
    },
    objectRow: {
        flexDirection: "row",
        marginBottom: 4,
    },
    messageRow: {
        flexDirection: "row",
        marginTop: 4,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "#eee",
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#666",
    },
    objectText: {
        fontSize: 14,
        color: "#444",
        flex: 1,
    },
    messageText: {
        fontSize: 14,
        color: "#666",
        flex: 1,
        fontStyle: "italic",
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
