import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, Image, TouchableOpacity } from "react-native";
import { supabase } from "../../../services/supabase";
import { useRouter, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

type Announcement = {
    id: string;
    title: string;
    description: string;
    image_url: string | null;
    created_at: string;
};

export default function Announcements() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const router = useRouter();

    const fetchAnnouncements = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Check if promoter is active
            const { data: userData } = await supabase
                .from('users')
                .select('is_active')
                .eq('id', user.id)
                .single();

            if (userData && userData.is_active === false) {
                setIsBlocked(true);
                setAnnouncements([]);
                setLoading(false);
                setRefreshing(false);
                return;
            } else {
                setIsBlocked(false);
            }

            const { data, error } = await supabase
                .from('announcements')
                .select(`
                    *,
                    announcement_targets!inner (
                        user_id
                    )
                `)
                .eq('announcement_targets.user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAnnouncements(data || []);
        } catch (error) {
            console.error("Failed to fetch announcements", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const channel = supabase
            .channel('realtime_announcements')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'announcement_targets',
                },
                (payload) => {
                    // Check if the new target is for the current user
                    supabase.auth.getUser().then(({ data: { user } }) => {
                        if (user && payload.new.user_id === user.id) {
                            fetchAnnouncements();
                        }
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchAnnouncements();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchAnnouncements();
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#1976d2" />
            </View>
        );
    }

    if (isBlocked) {
        return (
            <View style={[styles.center, { padding: 20 }]}>
                <MaterialIcons name="block" size={64} color="#d32f2f" style={{ marginBottom: 16 }} />
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#d32f2f', marginBottom: 8, textAlign: 'center' }}>
                    Access Blocked
                </Text>
                <Text style={{ fontSize: 16, color: '#555', textAlign: 'center' }}>
                    Your account has been blocked. You can no longer view announcements. Please contact the administrator for more information.
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={announcements}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No announcements available.</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        style={styles.card} 
                        onPress={() => router.push(`/promoter/details/${item.id}`)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.title}>{item.title}</Text>
                        <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>

                        {item.image_url && (
                            <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" />
                        )}

                        <Text style={styles.content} numberOfLines={3}>{item.description}</Text>
                        
                        <View style={styles.readMore}>
                            <Text style={styles.readMoreText}>Read more</Text>
                            <MaterialIcons name="keyboard-arrow-right" size={16} color="#1976d2" />
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
    title: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 5,
    },
    date: {
        fontSize: 12,
        color: "#888",
        marginBottom: 10,
    },
    image: {
        width: "100%",
        height: 150,
        borderRadius: 8,
        marginBottom: 10,
    },
    content: {
        fontSize: 16,
        color: "#555",
        lineHeight: 24,
    },
    emptyContainer: {
        padding: 40,
        alignItems: "center",
    },
    emptyText: {
        fontSize: 16,
        color: "#888",
    },
    readMore: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        justifyContent: 'flex-end',
    },
    readMoreText: {
        color: '#1976d2',
        fontSize: 14,
        fontWeight: 'bold',
        marginRight: 4,
    }
});
