import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Image, Alert, ActivityIndicator, ScrollView, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import api from "../../../services/api";
import { useRouter } from "expo-router";

export default function CreateAnnouncement() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

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

            if (imageUri) {
                if (Platform.OS === 'web') {
                    const response = await fetch(imageUri);
                    const blob = await response.blob();
                    formData.append("image", blob, "announcement.jpg");
                } else {
                    const filename = imageUri.split('/').pop() || 'announcement.jpg';
                    const match = /\.(\w+)$/.exec(filename);
                    const type = match ? `image/${match[1]}` : `image/jpeg`;

                    formData.append("image", {
                        uri: imageUri,
                        name: filename,
                        type,
                    } as any);
                }
            }

            await api.post("/announcements/create/", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            Alert.alert("Success", "Announcement posted!");
            setTitle("");
            setContent("");
            setImageUri(null);
            router.replace("/admin");
        } catch (error) {
            console.error("Upload failed", error);
            Alert.alert("Upload Failed", "There was an error posting the announcement.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
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

            <Text style={styles.label}>Feature Image (Optional)</Text>
            <View style={styles.imagePickerContainer}>
                {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.image} />
                ) : (
                    <Text style={styles.imagePlaceholder}>No image selected</Text>
                )}
                <Button title="Choose Image" onPress={pickImage} />
            </View>

            <View style={styles.submitContainer}>
                {isSubmitting ? (
                    <ActivityIndicator size="large" color="#1976d2" />
                ) : (
                    <Button title="Post Announcement" onPress={handleSubmit} color="#4caf50" />
                )}
            </View>
            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
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
    image: {
        width: "100%",
        height: 200,
        borderRadius: 8,
        marginBottom: 10,
    },
    submitContainer: {
        marginTop: 10,
    },
});
