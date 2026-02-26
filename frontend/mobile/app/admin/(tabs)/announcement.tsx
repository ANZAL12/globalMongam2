import React, { useEffect, useState, useCallback } from "react";
import {
    View, Text, TextInput, Button, StyleSheet, Image, Alert,
    ActivityIndicator, ScrollView, Platform, FlatList, RefreshControl,
    TouchableOpacity, Modal
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { MaterialIcons } from '@expo/vector-icons';
import api from "../../../services/api";
import { useFocusEffect } from "expo-router";

type Announcement = {
    id: number;
    title: string;
    description: string;
    image: string | null;
    target_promoters: number[];
    target_promoter_emails: string[];
    created_at: string;
};

type Promoter = {
    id: number;
    email: string;
    full_name: string;
    shop_name: string;
};

export default function AdminAnnouncements() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Form Modal State
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [targetPromoters, setTargetPromoters] = useState<number[]>([]);
    const [promoters, setPromoters] = useState<Promoter[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchAnnouncements = async () => {
        try {
            const res = await api.get("/announcements/");
            setAnnouncements(res.data);
        } catch (error) {
            console.error("Failed to fetch announcements", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchPromoters = async () => {
        try {
            const res = await api.get("/auth/admin/promoters/");
            setPromoters(res.data);
        } catch (error) {
            console.error("Failed to fetch promoters", error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchAnnouncements();
            fetchPromoters();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchAnnouncements();
    };

    const resetForm = () => {
        setTitle("");
        setContent("");
        setImageUri(null);
        setTargetPromoters([]);
        setSearchQuery("");
        setEditingId(null);
        setIsModalVisible(false);
    };

    const handleCreateNew = () => {
        resetForm();
        setIsModalVisible(true);
    };

    const handleEdit = (announcement: Announcement) => {
        setTitle(announcement.title);
        setContent(announcement.description);
        setImageUri(
            announcement.image
                ? (announcement.image.startsWith('http') ? announcement.image : `http://10.28.84.177:8000${announcement.image}`)
                : null
        );
        setTargetPromoters(announcement.target_promoters || []);
        setSearchQuery("");
        setEditingId(announcement.id);
        setIsModalVisible(true);
    };

    const handleDelete = (id: number) => {
        Alert.alert(
            "Delete Announcement",
            "Are you sure you want to delete this announcement?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await api.delete(`/announcements/${id}/`);
                            fetchAnnouncements();
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete announcement.");
                        }
                    }
                }
            ]
        );
    };

    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permissionResult.granted === false) {
            Alert.alert("Permission Required", "Please allow camera roll access to attach images.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleSubmit = async () => {
        if (!title || !content) {
            Alert.alert("Missing Fields", "Please enter a title and content.");
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("title", title);
            formData.append("description", content);
            targetPromoters.forEach(id => {
                formData.append("target_promoters", id.toString());
            });

            // Only append an image if it's a newly selected local URI (starts with file://)
            if (imageUri) {
                if (imageUri.startsWith('file://')) {
                    const filename = imageUri.split('/').pop() || 'announcement.jpg';
                    const match = /\.(\w+)$/.exec(filename);
                    const type = match ? `image/${match[1]}` : `image/jpeg`;

                    formData.append("image", {
                        uri: imageUri,
                        name: filename,
                        type,
                    } as any);
                }
            } else if (editingId) {
                // If editing and imageUri is null, tell backend to clear the image
                formData.append("image", "");
            }

            if (editingId) {
                await api.patch(`/announcements/${editingId}/`, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                Alert.alert("Success", "Announcement updated!");
            } else {
                await api.post("/announcements/create/", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                Alert.alert("Success", "Announcement posted!");
            }

            resetForm();
            fetchAnnouncements();
        } catch (error) {
            console.error("Upload failed", error);
            Alert.alert("Upload Failed", "There was an error saving the announcement.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading && !refreshing && !isModalVisible) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#1976d2" />
            </View>
        );
    }

    return (
        <View style={styles.listContainer}>
            <FlatList
                data={announcements}
                keyExtractor={(item) => item.id.toString()}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={{ paddingBottom: 100 }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No announcements available.</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.card} onPress={() => handleEdit(item)} activeOpacity={0.8}>
                        <View style={styles.cardHeader}>
                            <View style={{ flex: 1, paddingRight: 10 }}>
                                <Text style={styles.title}>{item.title}</Text>
                                <Text style={styles.date}>
                                    {new Date(item.created_at).toLocaleDateString()}
                                    {item.target_promoter_emails && item.target_promoter_emails.length > 0 && ` • Targets: ${item.target_promoter_emails.join(', ')}`}
                                </Text>
                            </View>
                            <View style={styles.actionButtons}>
                                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconBtn}>
                                    <MaterialIcons name="delete" size={22} color="#f44336" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {item.image && (
                            <Image
                                source={{ uri: item.image.startsWith('http') ? item.image : `http://10.28.84.177:8000${item.image}` }}
                                style={styles.image}
                                resizeMode="cover"
                            />
                        )}

                        <Text style={styles.content}>{item.description}</Text>
                    </TouchableOpacity>
                )}
            />

            <TouchableOpacity style={styles.fab} onPress={handleCreateNew}>
                <MaterialIcons name="add" size={28} color="#fff" />
            </TouchableOpacity>

            <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{editingId ? "Edit Announcement" : "New Announcement"}</Text>
                    <TouchableOpacity onPress={resetForm} style={styles.closeBtn}>
                        <MaterialIcons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalContainer}>
                    <Text style={styles.label}>Announcement Title *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. November Sales Competition!"
                        value={title}
                        onChangeText={setTitle}
                    />

                    <Text style={styles.label}>Content / Message *</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Write the full announcement here..."
                        value={content}
                        onChangeText={setContent}
                        multiline
                        numberOfLines={6}
                        textAlignVertical="top"
                    />

                    <Text style={styles.label}>Target Promoters (Optional)</Text>
                    <Text style={{ fontSize: 12, color: "#666", marginBottom: 5 }}>Tap multiple to select. Deselect all to notify everyone.</Text>

                    <TextInput
                        style={[styles.input, { marginBottom: 10, paddingVertical: 8 }]}
                        placeholder="Search promoters by name, email, or shop..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promoterList}>
                        <TouchableOpacity
                            style={[styles.promoterChip, targetPromoters.length === 0 && styles.promoterChipSelected]}
                            onPress={() => setTargetPromoters([])}
                        >
                            <Text style={[styles.promoterChipText, targetPromoters.length === 0 && styles.promoterChipTextSelected]}>All Promoters</Text>
                        </TouchableOpacity>
                        {promoters.filter(p =>
                            p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.shop_name?.toLowerCase().includes(searchQuery.toLowerCase())
                        ).map(p => {
                            const isSelected = targetPromoters.includes(p.id);
                            return (
                                <TouchableOpacity
                                    key={p.id}
                                    style={[styles.promoterChip, isSelected && styles.promoterChipSelected]}
                                    onPress={() => {
                                        if (isSelected) {
                                            setTargetPromoters(prev => prev.filter(id => id !== p.id));
                                        } else {
                                            setTargetPromoters(prev => [...prev, p.id]);
                                        }
                                    }}
                                >
                                    <Text style={[styles.promoterChipText, isSelected && styles.promoterChipTextSelected]}>
                                        {p.full_name || p.email}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <Text style={styles.label}>Feature Image (Optional)</Text>
                    <View style={styles.imagePickerContainer}>
                        {imageUri ? (
                            <View style={{ width: "100%", position: 'relative' }}>
                                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                                <TouchableOpacity
                                    style={styles.removeImageBtn}
                                    onPress={() => setImageUri(null)}
                                >
                                    <MaterialIcons name="close" size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <Text style={styles.imagePlaceholder}>No image selected</Text>
                        )}
                        <Button title={imageUri ? "Change Image" : "Choose Image"} onPress={pickImage} />
                    </View>

                    <View style={styles.submitContainer}>
                        {isSubmitting ? (
                            <ActivityIndicator size="large" color="#1976d2" />
                        ) : (
                            <Button title={editingId ? "Update Announcement" : "Post Announcement"} onPress={handleSubmit} color="#1976d2" />
                        )}
                    </View>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    listContainer: {
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 5,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#333",
    },
    date: {
        fontSize: 12,
        color: "#888",
        marginTop: 2,
        marginBottom: 10,
    },
    actionButtons: {
        flexDirection: 'row',
    },
    iconBtn: {
        padding: 5,
        marginLeft: 10,
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
    fab: {
        position: 'absolute',
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        right: 20,
        bottom: 20,
        backgroundColor: '#1976d2',
        borderRadius: 28,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 4,
        shadowOffset: { height: 2, width: 0 },
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#fff',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeBtn: {
        padding: 5,
    },
    modalContainer: {
        flex: 1,
        padding: 20,
        backgroundColor: "#fff",
    },
    label: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 8,
        color: "#333",
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 20,
        backgroundColor: "#fafafa",
    },
    textArea: {
        height: 120,
    },
    imagePickerContainer: {
        alignItems: "center",
        marginBottom: 30,
    },
    imagePlaceholder: {
        padding: 40,
        borderWidth: 1,
        borderColor: "#ccc",
        borderStyle: "dashed",
        borderRadius: 8,
        marginBottom: 10,
        color: "#888",
    },
    previewImage: {
        width: "100%",
        height: 200,
        borderRadius: 8,
        marginBottom: 10,
    },
    removeImageBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 15,
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitContainer: {
        marginTop: 10,
    },
    promoterList: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    promoterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    promoterChipSelected: {
        backgroundColor: '#e3f2fd',
        borderColor: '#1976d2',
    },
    promoterChipText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '500',
    },
    promoterChipTextSelected: {
        color: '#1976d2',
        fontWeight: 'bold',
    },
});
