import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Image, Alert, ActivityIndicator, Platform, ScrollView, Modal, TouchableOpacity, Vibration } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { CameraView, useCameraPermissions, scanFromURLAsync } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../../services/supabase";
import { useRouter } from "expo-router";

// Barcode scanner is enabled by default unless explicitly set to 'off' or 'false'
const isBarcodeScannerEnabled = (
    process.env.EXPO_PUBLIC_ENABLE_BARCODE_SCANNER !== "off" &&
    process.env.EXPO_PUBLIC_ENABLE_BARCODE_SCANNER !== "false"
);

export default function UploadSale() {
    const router = useRouter();
    const [productName, setProductName] = useState("");
    const [modelNo, setModelNo] = useState("");
    const [serialNo, setSerialNo] = useState("");
    const [billNo, setBillNo] = useState("");
    const [billAmount, setBillAmount] = useState("");
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [isScanned, setIsScanned] = useState(false);
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();

    const startScanning = async () => {
        if (!isBarcodeScannerEnabled) {
            Alert.alert("Feature Disabled", "Barcode scanner is currently disabled in app settings.");
            return;
        }
        if (!cameraPermission?.granted) {
            const result = await requestCameraPermission();
            if (!result.granted) {
                Alert.alert("Camera Permission Required", "Please allow camera access in your device settings to scan barcodes.");
                return;
            }
        }
        setIsScanned(false);
        setIsScanning(true);
    };

    const handleBarcodeScanned = ({ data }: { data: string }) => {
        if (isScanned) return;
        setIsScanned(true);

        // Mobile Vibration and Haptic Feedback
        try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {}
        try {
            Vibration.vibrate(150);
        } catch (e) {}

        if (data) {
            setSerialNo(data.trim());
        }
        setIsScanning(false);
    };

    const pickBarcodeFromGallery = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permissionResult.granted === false) {
                Alert.alert("Permission Required", "Please allow photo library access to scan barcodes from images.");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                quality: 1,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const pickedUri = result.assets[0].uri;
                const scannedResults = await scanFromURLAsync(pickedUri, [
                    'qr',
                    'code128',
                    'code39',
                    'code93',
                    'codabar',
                    'ean13',
                    'ean8',
                    'upc_a',
                    'upc_e',
                    'itf14',
                    'pdf417',
                    'aztec',
                    'datamatrix',
                ]);

                if (scannedResults && scannedResults.length > 0 && scannedResults[0].data) {
                    try {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } catch (e) {}
                    try {
                        Vibration.vibrate(150);
                    } catch (e) {}
                    setSerialNo(scannedResults[0].data.trim());
                    setIsScanning(false);
                } else {
                    Alert.alert(
                        "No Barcode Detected",
                        "We couldn't detect a barcode in this photo. Please ensure the barcode is clearly visible, or scan directly with the camera."
                    );
                }
            }
        } catch (error: any) {
            console.error("Failed to scan barcode from gallery image", error);
            Alert.alert("Scan Failed", "Could not scan the image. Please try another image or use the camera.");
        }
    };

    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permissionResult.granted === false) {
            Alert.alert("Permission Required", "Please allow camera roll access to upload bills.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setImageUri(result.assets[0].uri);
            setImageBase64(result.assets[0].base64 || null);
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
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setImageUri(result.assets[0].uri);
            setImageBase64(result.assets[0].base64 || null);
        }
    };

    const handleSubmit = async () => {
        if (!productName || !modelNo || !serialNo || !billNo || !billAmount || !imageUri) {
            Alert.alert("Missing Fields", "Please fill in all mandatory fields (*) and select an image.");
            return;
        }

        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User session not found.");

            // Verify account is not blocked
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('is_active')
                .eq('id', user.id)
                .single();

            if (userError) throw new Error("Failed to verify account status.");
            if (userData && userData.is_active === false) {
                Alert.alert("Action Blocked", "Your account is blocked. Please contact the admin.");
                setIsSubmitting(false);
                return;
            }

            let bill_image_url = "";

            if (imageUri) {
                // Get filename and MIME type
                const filename = imageUri.split('/').pop() || 'upload.jpg';
                const match = /\.(\w+)$/.exec(filename);
                const mimeType = match ? `image/${match[1].toLowerCase()}` : `image/jpeg`;

                let base64Data = imageBase64;
                if (!base64Data) {
                    // Fallback: convert URI to base64 using blob/FileReader
                    const blobRes = await fetch(imageUri);
                    const blob = await blobRes.blob();
                    base64Data = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const res = reader.result as string;
                            resolve(res.includes(',') ? res.split(',')[1] : res);
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                }

                const uploadPreset = (process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default').trim();
                const cloudName = (process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dd1kxaadg').trim();

                const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        file: `data:${mimeType};base64,${base64Data}`,
                        upload_preset: uploadPreset,
                    }),
                });

                const uploadData = await response.json();
                if (uploadData.error) {
                    throw new Error(uploadData.error.message);
                }

                bill_image_url = uploadData.secure_url;
            }

            const { error: dbError } = await supabase
                .from('sales')
                .insert([{
                    promoter_id: user.id,
                    product_name: productName,
                    model_no: modelNo,
                    serial_no: serialNo,
                    bill_no: billNo,
                    bill_amount: parseFloat(billAmount),
                    bill_image_url: bill_image_url,
                    status: 'pending',
                    payment_status: 'unpaid'
                }]);

            if (dbError) {
                if (dbError.code === '23505') { // Unique constraint violation
                    throw new Error("This bill number has already been used. Please check the number.");
                }
                throw dbError;
            }

            Alert.alert("Success", "Sale uploaded successfully!", [
                {
                    text: "OK",
                    onPress: () => {
                        setProductName("");
                        setModelNo("");
                        setSerialNo("");
                        setBillNo("");
                        setBillAmount("");
                        setImageUri(null);
                        setImageBase64(null);
                        setIsSubmitting(false);
                        router.replace("/promoter/(tabs)/sales");
                    }
                }
            ]);
        } catch (error: any) {
            console.log("Upload failed", error);

            let alertTitle = "Submission Error";
            let errorMessage = error.message || "We encountered a problem while uploading your sale. Please try again.";

            if (error.message && error.message.includes('already exists')) {
                alertTitle = "Duplicate Bill";
            }

            Alert.alert(alertTitle, errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Text style={styles.label}>Product Name *</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g. Samsung S23"
                placeholderTextColor="#999"
                value={productName}
                onChangeText={setProductName}
            />

            <Text style={styles.label}>Model No *</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g. SM-S911B"
                placeholderTextColor="#999"
                value={modelNo}
                onChangeText={setModelNo}
            />

            {isBarcodeScannerEnabled ? (
                <>
                    <View style={styles.labelRow}>
                        <Text style={styles.label}>Serial No *</Text>
                        <TouchableOpacity
                            style={styles.scanBadgeButton}
                            onPress={startScanning}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="barcode-outline" size={18} color="#1976d2" />
                            <Text style={styles.scanBadgeText}>Scan Barcode</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.inputWithIconContainer}>
                        <TextInput
                            style={styles.inputWithIcon}
                            placeholder="e.g. RZ8T123456"
                            placeholderTextColor="#999"
                            value={serialNo}
                            onChangeText={setSerialNo}
                        />
                        <TouchableOpacity
                            style={styles.inputTrailingIcon}
                            onPress={startScanning}
                            activeOpacity={0.7}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="scan" size={22} color="#1976d2" />
                        </TouchableOpacity>
                    </View>
                </>
            ) : (
                <>
                    <Text style={styles.label}>Serial No *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. RZ8T123456"
                        placeholderTextColor="#999"
                        value={serialNo}
                        onChangeText={setSerialNo}
                    />
                </>
            )}

            <Text style={styles.label}>Bill No *</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g. INV-12345"
                placeholderTextColor="#999"
                value={billNo}
                onChangeText={setBillNo}
            />

            <Text style={styles.label}>Bill Amount *</Text>
            <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#999"
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

        {/* Barcode Scanner Modal for Mobile */}
        {isBarcodeScannerEnabled && (
            <Modal
                visible={isScanning}
                animationType="slide"
                onRequestClose={() => setIsScanning(false)}
            >
                <View style={styles.scannerModalContainer}>
                    <CameraView
                        style={StyleSheet.absoluteFill}
                        facing="back"
                        barcodeScannerSettings={{
                            barcodeTypes: [
                                'qr',
                                'code128',
                                'code39',
                                'code93',
                                'codabar',
                                'ean13',
                                'ean8',
                                'upc_a',
                                'upc_e',
                                'itf14',
                                'pdf417',
                                'aztec',
                                'datamatrix',
                            ],
                        }}
                        onBarcodeScanned={isScanned ? undefined : handleBarcodeScanned}
                    />

                    <View style={styles.scannerOverlay}>
                        <View style={styles.scannerHeader}>
                            <TouchableOpacity
                                style={styles.scannerCloseButton}
                                onPress={() => setIsScanning(false)}
                            >
                                <Ionicons name="close" size={28} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.scannerHeaderTitle}>Scan Serial Barcode</Text>
                            <TouchableOpacity
                                style={styles.scannerGalleryButton}
                                onPress={pickBarcodeFromGallery}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="images" size={22} color="#fff" />
                            </TouchableOpacity>
                        </View>

                    <View style={styles.scannerFrameContainer}>
                        <View style={styles.scannerTargetBox}>
                            <View style={[styles.boxCorner, styles.cornerTopLeft]} />
                            <View style={[styles.boxCorner, styles.cornerTopRight]} />
                            <View style={[styles.boxCorner, styles.cornerBottomLeft]} />
                            <View style={[styles.boxCorner, styles.cornerBottomRight]} />
                            <View style={styles.scanLaser} />
                        </View>
                        <Text style={styles.scannerInstructions}>
                            Center barcode or QR code inside the box, or tap below to upload from gallery
                        </Text>
                    </View>

                    <View style={styles.scannerFooter}>
                        <TouchableOpacity
                            style={styles.galleryActionButton}
                            onPress={pickBarcodeFromGallery}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="image-outline" size={20} color="#fff" />
                            <Text style={styles.galleryActionButtonText}>Upload from Gallery</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.scannerCancelButton}
                            onPress={() => setIsScanning(false)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.scannerCancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    )}
    </>
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
    labelRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    scanBadgeButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#e3f2fd",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 14,
        gap: 4,
    },
    scanBadgeText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#1976d2",
    },
    inputWithIconContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        backgroundColor: "#fafafa",
        marginBottom: 20,
    },
    inputWithIcon: {
        flex: 1,
        padding: 12,
        fontSize: 16,
    },
    inputTrailingIcon: {
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    scannerModalContainer: {
        flex: 1,
        backgroundColor: "#000",
    },
    scannerOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "space-between",
        paddingTop: Platform.OS === "ios" ? 50 : 30,
        paddingBottom: 40,
    },
    scannerHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
    },
    scannerCloseButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center",
    },
    scannerHeaderTitle: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "600",
    },
    scannerFrameContainer: {
        alignItems: "center",
        justifyContent: "center",
    },
    scannerTargetBox: {
        width: 280,
        height: 180,
        borderRadius: 12,
        position: "relative",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.2)",
    },
    boxCorner: {
        position: "absolute",
        width: 24,
        height: 24,
        borderColor: "#2196f3",
    },
    cornerTopLeft: {
        top: -2,
        left: -2,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderTopLeftRadius: 8,
    },
    cornerTopRight: {
        top: -2,
        right: -2,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderTopRightRadius: 8,
    },
    cornerBottomLeft: {
        bottom: -2,
        left: -2,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderBottomLeftRadius: 8,
    },
    cornerBottomRight: {
        bottom: -2,
        right: -2,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderBottomRightRadius: 8,
    },
    scanLaser: {
        width: "90%",
        height: 2,
        backgroundColor: "#ff1744",
        shadowColor: "#ff1744",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 5,
        elevation: 5,
    },
    scannerInstructions: {
        color: "rgba(255,255,255,0.85)",
        fontSize: 14,
        textAlign: "center",
        marginTop: 24,
        paddingHorizontal: 30,
    },
    scannerFooter: {
        alignItems: "center",
        paddingHorizontal: 20,
    },
    scannerCancelButton: {
        backgroundColor: "rgba(255,255,255,0.2)",
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 24,
    },
    scannerCancelButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    scannerGalleryButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center",
    },
    galleryActionButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#1976d2",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        gap: 8,
        marginBottom: 12,
    },
    galleryActionButtonText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "600",
    },
});
