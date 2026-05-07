import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { supabase } from "../../../services/supabase";
import { MaterialIcons } from "@expo/vector-icons";

type Announcement = {
    id: string;
    title: string;
    description: string;
    image_url: string | null;
    created_at: string;
};

export default function ApproverAnnouncementDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [announcement, setAnnouncement] = useState<Announcement | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchAnnouncement();
        }
    }, [id]);

    const fetchAnnouncement = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('announcements')
                .select(`
                    *,
                    announcement_targets!inner (
                        user_id
                    )
                `)
                .eq('id', id)
                .eq('announcement_targets.user_id', user.id)
                .single();

            if (error) throw error;
            setAnnouncement(data);
        } catch (error) {
            console.error("Failed to fetch approver announcement details", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#1976d2" />
            </View>
        );
    }

    if (!announcement) {
        return (
            <View style={styles.center}>
                <Text>Announcement not found.</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Stack.Screen
                options={{
                    headerTitle: "Announcement Details",
                    headerShown: true,
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
                            <MaterialIcons name="arrow-back" size={24} color="#333" />
                        </TouchableOpacity>
                    )
                }}
            />

            <View style={styles.card}>
                <Text style={styles.title}>{announcement.title}</Text>
                <View style={styles.dateContainer}>
                    <MaterialIcons name="calendar-today" size={14} color="#888" />
                    <Text style={styles.date}>
                        {new Date(announcement.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </Text>
                </View>

                {announcement.image_url && (
                    <Image
                        source={{ uri: announcement.image_url }}
                        style={styles.image}
                        resizeMode="contain"
                    />
                )}

                <View style={styles.divider} />

                <Text style={styles.description}>{announcement.description}</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    contentContainer: {
        paddingBottom: 40,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    card: {
        backgroundColor: "#fff",
        margin: 15,
        padding: 20,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 8,
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    date: {
        fontSize: 14,
        color: "#888",
        marginLeft: 5,
    },
    image: {
        width: "100%",
        height: 300,
        borderRadius: 12,
        marginBottom: 20,
        backgroundColor: '#f0f0f0',
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginBottom: 20,
    },
    description: {
        fontSize: 16,
        color: "#444",
        lineHeight: 26,
    },
});
