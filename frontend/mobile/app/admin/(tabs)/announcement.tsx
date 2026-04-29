import React, { useEffect, useState, useCallback } from "react";
import {
    View, Text, TextInput, Button, StyleSheet, Image, Alert,
    ActivityIndicator, ScrollView, Platform, FlatList, RefreshControl,
    TouchableOpacity, Modal
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from "../../../services/supabase";
import { useFocusEffect } from "expo-router";

type Announcement = {
    id: string;
    title: string;
    description: string;
    image_url: string | null;
    target_promoters: string[];
    target_promoter_emails: string[];
    created_at: string;
};

type Promoter = {
    id: string;
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
    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [targetPromoters, setTargetPromoters] = useState<string[]>([]);
    const [promoters, setPromoters] = useState<Promoter[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchAnnouncements = async () => {
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select(`
                    *,
                    announcement_targets(user_id)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Optional: Map targets if we want to display target counts or emails
            // We'd need to fetch user emails for those targets if we want them displayed
            // For now, mirroring just the basic struct
            const mapped = (data || []).map((ann: any) => ({
                id: ann.id,
                title: ann.title,
                description: ann.description,
                image_url: ann.image_url,
                created_at: ann.created_at,
                target_promoters: ann.announcement_targets?.map((t: any) => t.user_id) || [],
                target_promoter_emails: [], // Could fetch if needed, omitting for speed or fetch separately
            }));

            setAnnouncements(mapped);
        } catch (error) {
            console.error("Failed to fetch announcements", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchPromoters = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, email, full_name, shop_name')
                .eq('role', 'promoter');
            
            if (error) throw error;
            setPromoters(data || []);
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
            announcement.image_url
                ? (announcement.image_url.startsWith('http') ? announcement.image_url : announcement.image_url)
                : null
        );
        setTargetPromoters(announcement.target_promoters || []);
        setSearchQuery("");
        setEditingId(announcement.id);
        setIsModalVisible(true);
    };

    const handleDelete = (id: string) => {
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
                            // Supabase will cascade delete targets
                            const { error } = await supabase.from('announcements').delete().eq('id', id);
                            if (error) throw error;
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
            let uploadedImageUrl = null;

            if (imageUri) {
                // Upload to Cloudinary using React Native FormData's special file object
                const formData = new FormData();
                
                const filename = imageUri.split('/').pop() || 'upload.jpg';
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image/jpeg`;

                formData.append('file', {
                    uri: imageUri,
                    name: filename,
                    type: type,
                } as any);

                const uploadPreset = (process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default').trim();
                const cloudName = (process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dy8s5kclm').trim();

                formData.append('upload_preset', uploadPreset);
                formData.append('cloud_name', cloudName);

                const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                    method: 'POST',
                    body: formData,
                });

                const uploadData = await response.json();
                if (uploadData.error) throw new Error(uploadData.error.message);

                uploadedImageUrl = uploadData.secure_url;
            }

            let savedAnnouncementId = editingId;

            if (editingId) {
                const updateData: any = { title, description: content };
                if (uploadedImageUrl) {
                    updateData.image_url = uploadedImageUrl;
                } else if (!imageUri) {
                    updateData.image_url = null; // Cleared
                }

                const { error } = await supabase.from('announcements').update(updateData).eq('id', editingId);
                if (error) throw error;

                // Delete old targets
                await supabase.from('announcement_targets').delete().eq('announcement_id', editingId);
                Alert.alert("Success", "Announcement updated!");
            } else {
                const { data, error } = await supabase.from('announcements').insert([{
                    title,
                    description: content,
                    image_url: uploadedImageUrl,
                }]).select();

                if (error) throw error;
                if (data && data.length > 0) {
                    savedAnnouncementId = data[0].id;
                }
                Alert.alert("Success", "Announcement posted!");
            }

            // Insert targets if any
            if (savedAnnouncementId && targetPromoters.length > 0) {
                const targetInserts = targetPromoters.map(uid => ({
                    announcement_id: savedAnnouncementId,
                    user_id: uid
                }));
                await supabase.from('announcement_targets').insert(targetInserts);
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
                    <TouchableOpacity style={styles.card} onPress={() => handleEdit(item)} activeOpacity={0.8} delayPressIn={100}>
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

                        {item.image_url && (
                            <Image
                                source={{ uri: item.image_url.startsWith('http') ? item.image_url : item.image_url }}
                                style={styles.image}
                                resizeMode="cover"
                            />
                        )}

                        <Text style={styles.content}>{item.description}</Text>
                    </TouchableOpacity>
                )}
            />

            <TouchableOpacity style={styles.fab} onPress={handleCreateNew}>
                <MaterialIcons name="add" size={24} color="#fff" />
            </TouchableOpacity>

            <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={resetForm}>
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
                        placeholderTextColor="#999"
                        value={title}
                        onChangeText={setTitle}
                    />

                    <Text style={styles.label}>Content / Message *</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Write the full announcement here..."
                        placeholderTextColor="#999"
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
                        placeholderTextColor="#999"
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
        width: 50,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        right: 20,
        bottom: 20,
        backgroundColor: '#1976d2',
        borderRadius: 25,
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
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: Platform.OS === 'ios' ? 20 : 50,
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
