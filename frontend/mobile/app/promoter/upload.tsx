import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Image, Alert, ActivityIndicator, Platform, ScrollView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import api from "../../services/api";
import { useRouter } from "expo-router";

export default function UploadSale() {
    const router = useRouter();
    const [productName, setProductName] = useState("");
    const [billNo, setBillNo] = useState("");
    const [billAmount, setBillAmount] = useState("");
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permissionResult.granted === false) {
            Alert.alert("Permission Required", "Please allow camera roll access to upload bills.");
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

    const takePhoto = async () => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

        if (permissionResult.granted === false) {
            Alert.alert("Permission Required", "Please allow camera access to take a photo of the bill.");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: 'images',
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleSubmit = async () => {
        if (!productName || !billNo || !billAmount || !imageUri) {
            Alert.alert("Missing Fields", "Please fill in all mandatory fields (*) and select an image.");
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("product_name", productName);
            formData.append("bill_no", billNo);
            formData.append("bill_amount", billAmount);

            if (imageUri) {
                if (Platform.OS === 'web') {
                    const response = await fetch(imageUri);
                    const blob = await response.blob();
                    formData.append("bill_image", blob, "bill.jpg");
                } else {
                    const filename = imageUri.split('/').pop() || 'bill.jpg';
                    const match = /\.(\w+)$/.exec(filename);
                    const type = match ? `image/${match[1]}` : `image/jpeg`;

                    formData.append("bill_image", {
                        uri: imageUri,
                        name: filename,
                        type,
                    } as any);
                }
            }

            await api.post("/sales/create/", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            Alert.alert("Success", "Sale uploaded successfully!");
            setProductName("");
            setBillNo("");
            setBillAmount("");
            setImageUri(null);
            router.replace("/promoter");
        } catch (error: any) {
            console.log("Upload failed", error);

            let alertTitle = "Submission Error";
            let errorMessage = "We encountered a problem while uploading your sale. Please try again.";

            if (error.response && error.response.data) {
                const data = error.response.data;
                if (data.bill_no) {
                    const billError = data.bill_no.join(' ').toLowerCase();
                    if (billError.includes('already exists')) {
                        alertTitle = "Duplicate Bill";
                        errorMessage = "This bill number has already been used. Please check the number.";
                    } else {
                        errorMessage = data.bill_no.join(' ');
                    }
                } else if (data.detail) {
                    errorMessage = data.detail;
                }
            } else if (!error.response) {
                alertTitle = "Connection Error";
                errorMessage = "Could not connect to the server. Please check your internet connection.";
            }

            Alert.alert(alertTitle, errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Text style={styles.label}>Product Name *</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g. Samsung S23"
                value={productName}
                onChangeText={setProductName}
            />

            <Text style={styles.label}>Bill No *</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g. INV-12345"
                value={billNo}
                onChangeText={setBillNo}
            />

            <Text style={styles.label}>Bill Amount *</Text>
            <TextInput
                style={styles.input}
                placeholder="0.00"
                value={billAmount}
                onChangeText={setBillAmount}
                keyboardType="numeric"
            />

            <Text style={styles.label}>Bill Image *</Text>
            <View style={styles.imagePickerContainer}>
                {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.image} />
                ) : (
                    <View style={styles.imagePlaceholder}>
                        <Text style={styles.imagePlaceholderText}>No image selected</Text>
                    </View>
                )}
                <View style={styles.buttonRow}>
                    <View style={styles.buttonWrapper}>
                        <Button title="Choose Image" onPress={pickImage} />
                    </View>
                    <View style={styles.buttonWrapper}>
                        <Button title="Take Photo" onPress={takePhoto} color="#1976d2" />
                    </View>
                </View>
            </View>

            <View style={styles.submitContainer}>
                {isSubmitting ? (
                    <ActivityIndicator size="large" color="#1976d2" />
                ) : (
                    <Button title="Submit Sale" onPress={handleSubmit} color="#4caf50" />
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    contentContainer: {
        padding: 20,
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
    imagePickerContainer: {
        alignItems: "center",
        marginBottom: 30,
    },
    imagePlaceholder: {
        width: 200,
        height: 200,
        borderWidth: 1,
        borderColor: "#ccc",
        borderStyle: "dashed",
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 10,
    },
    imagePlaceholderText: {
        color: "#888",
    },
    image: {
        width: 200,
        height: 200,
        borderRadius: 8,
        marginBottom: 10,
    },
    buttonRow: {
        flexDirection: "row",
        justifyContent: "center",
        width: "100%",
    },
    buttonWrapper: {
        marginHorizontal: 10,
    },
    submitContainer: {
        marginTop: 10,
    },
});
