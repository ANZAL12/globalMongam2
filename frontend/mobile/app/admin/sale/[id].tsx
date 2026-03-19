import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Image, Button, Alert, TextInput, Modal, TouchableOpacity, Clipboard } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { supabase } from "../../../services/supabase";

type SaleDetail = {
    id: string;
    promoter_email: string;
    product_name: string;
    model_no: string | null;
    serial_no: string | null;
    bill_no: string | null;
    bill_amount: string;
    bill_image: string | null;
    status: string;
    incentive_amount: string | null;
    payment_status: string;
    created_at: string;
    transaction_id: string | null;
    promoter_phone: string | null;
    promoter_gpay: string | null;
};

export default function SaleDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [sale, setSale] = useState<SaleDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [incentiveInput, setIncentiveInput] = useState("");
    const [transactionIdInput, setTransactionIdInput] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [isImageModalVisible, setIsImageModalVisible] = useState(false);

    useEffect(() => {
        fetchSaleDetails();
    }, [id]);

    const fetchSaleDetails = async () => {
        try {
            const { data, error } = await supabase
                .from('sales')
                .select(`
                    *,
                    promoter:users!sales_promoter_id_fkey (
                        email,
                        phone_number,
                        gpay_number
                    )
                `)
                .eq('id', id)
                .single();

            if (error) throw error;

            if (data) {
                const mappedSale: SaleDetail = {
                    ...data,
                    promoter_email: data.promoter?.email || 'Unknown',
                    promoter_phone: data.promoter?.phone_number || 'N/A',
                    promoter_gpay: data.promoter?.gpay_number || 'N/A',
                    bill_image: data.bill_image_url
                };
                setSale(mappedSale);
                setIncentiveInput(data.incentive_amount ? data.incentive_amount.toString() : "");
                setTransactionIdInput(data.transaction_id || "");
            } else {
                Alert.alert("Error", "Sale not found.");
                router.back();
            }
        } catch (error) {
            console.error("Failed to fetch sale", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!incentiveInput || isNaN(parseFloat(incentiveInput))) {
            Alert.alert("Invalid Input", "Please enter a valid incentive amount.");
            return;
        }

        setIsProcessing(true);
        try {
            const { error } = await supabase
                .from('sales')
                .update({ 
                    status: "approved", 
                    incentive_amount: parseFloat(incentiveInput), 
                    transaction_id: transactionIdInput,
                    approved_at: new Date().toISOString() 
                })
                .eq('id', id);

            if (error) throw error;
            Alert.alert("Success", "Sale has been approved.");
            fetchSaleDetails();
        } catch (error) {
            Alert.alert("Error", "Failed to approve sale.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        Alert.alert(
            "Reject Sale",
            "Are you sure you want to reject this sale?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reject",
                    style: "destructive",
                    onPress: async () => {
                        setIsProcessing(true);
                        try {
                            const { error } = await supabase
                                .from('sales')
                                .update({ status: "rejected" })
                                .eq('id', id);

                            if (error) throw error;
                            Alert.alert("Success", "Sale has been rejected.");
                            fetchSaleDetails();
                        } catch (error) {
                            Alert.alert("Error", "Failed to reject sale.");
                        } finally {
                            setIsProcessing(false);
                        }
                    }
                }
            ]
        );
    };

    const handleMarkPaid = async () => {
        setIsProcessing(true);
        try {
            const { error } = await supabase
                .from('sales')
                .update({ 
                    payment_status: "paid", 
                    transaction_id: transactionIdInput || sale?.transaction_id,
                    paid_at: new Date().toISOString() 
                })
                .eq('id', id);

            if (error) throw error;
            Alert.alert("Success", "Sale marked as paid.");
            fetchSaleDetails();
        } catch (error) {
            Alert.alert("Error", "Failed to mark as paid.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading || !sale) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#1976d2" />
            </View>
        );
    }

    const isPending = sale.status === "pending";
    const isApprovedUnpaid = sale.status === "approved" && sale.payment_status === "unpaid";

    // Support image URLs lacking the absolute server path if requested locally
    const getImageUrl = (url: string) => {
        return url.startsWith('http') ? url : `http://10.28.84.177:8000${url}`;
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.label}>Promoter</Text>
                <Text style={styles.value}>{sale.promoter_email}</Text>
                
                <Text style={styles.label}>Promoter Phone</Text>
                <Text style={styles.value}>{sale.promoter_phone}</Text>

                <View style={styles.gpayContainer}>
                    <Text style={[styles.label, { color: '#2e7d32' }]}>GPay Number (Tap to Copy)</Text>
                    <TouchableOpacity 
                        style={styles.gpayBadge}
                        onPress={() => {
                            if (sale.promoter_gpay && sale.promoter_gpay !== 'N/A') {
                                // @ts-ignore
                                Clipboard.setString(sale.promoter_gpay);
                                alert('GPay Number copied to clipboard');
                            }
                        }}
                    >
                        <Text style={styles.gpayValue}>{sale.promoter_gpay}</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.label}>Product Name</Text>
                <Text style={styles.value}>{sale.product_name}</Text>

                {sale.model_no && (
                    <>
                        <Text style={styles.label}>Model Number</Text>
                        <Text style={styles.value}>{sale.model_no}</Text>
                    </>
                )}

                {sale.serial_no && (
                    <>
                        <Text style={styles.label}>Serial Number</Text>
                        <Text style={styles.value}>{sale.serial_no}</Text>
                    </>
                )}

                {sale.bill_no && (
                    <>
                        <Text style={styles.label}>Bill Number</Text>
                        <Text style={styles.value}>{sale.bill_no}</Text>
                    </>
                )}

                <Text style={styles.label}>Bill Amount</Text>
                <Text style={styles.value}>₹{sale.bill_amount}</Text>

                <Text style={styles.label}>Date Submitted</Text>
                <Text style={styles.value}>{new Date(sale.created_at).toLocaleDateString()}</Text>

                <View style={styles.row}>
                    <View>
                        <Text style={styles.label}>Status</Text>
                        <Text style={[styles.value, { color: sale.status === 'approved' ? '#4caf50' : sale.status === 'rejected' ? '#f44336' : '#ff9800' }]}>
                            {sale.status.toUpperCase()}
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.label}>Payment Status</Text>
                        <Text style={styles.value}>{sale.payment_status.toUpperCase()}</Text>
                    </View>
                </View>

                {sale.bill_image && (
                    <View style={styles.imageContainer}>
                        <Text style={styles.label}>Bill Image</Text>
                        <TouchableOpacity onPress={() => setIsImageModalVisible(true)} activeOpacity={0.8} style={styles.thumbnailButton}>
                            <Image source={{ uri: getImageUrl(sale.bill_image) }} style={styles.image} resizeMode="cover" />
                            <View style={styles.zoomOverlay}>
                                <MaterialIcons name="zoom-in" size={24} color="#fff" />
                                <Text style={styles.zoomText}>Tap to Enlarge</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                {sale.transaction_id && (
                    <View style={{ marginTop: 15 }}>
                        <Text style={styles.label}>Transaction ID</Text>
                        <Text style={styles.value}>{sale.transaction_id}</Text>
                    </View>
                )}

                {isProcessing && <ActivityIndicator style={{ marginTop: 20 }} color="#1976d2" />}

                {!isProcessing && isPending && (
                    <View style={styles.actionsContainer}>
                        <Text style={styles.label}>Assign Incentive Amount (₹)</Text>
                        <TextInput
                            style={styles.input}
                            value={incentiveInput}
                            onChangeText={setIncentiveInput}
                            keyboardType="numeric"
                            placeholder="10.00"
                        />
                        <Text style={styles.label}>Transaction ID (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            value={transactionIdInput}
                            onChangeText={setTransactionIdInput}
                            placeholder="TXN12345678"
                        />
                        <View style={styles.buttonRow}>
                            <View style={styles.buttonWrapper}>
                                <Button title="Approve" onPress={handleApprove} color="#4caf50" />
                            </View>
                            <View style={styles.buttonWrapper}>
                                <Button title="Reject" onPress={handleReject} color="#f44336" />
                            </View>
                        </View>
                    </View>
                )}

                {!isProcessing && !isPending && (
                    <View style={styles.actionsContainer}>
                        <Text style={styles.label}>Incentive Assigned</Text>
                        <Text style={styles.value}>{sale.incentive_amount ? `₹${sale.incentive_amount}` : "None"}</Text>
                    </View>
                )}

                {!isProcessing && isApprovedUnpaid && (
                    <View style={styles.markPaidContainer}>
                        <Text style={styles.label}>Transaction ID (Update if needed)</Text>
                        <TextInput
                            style={styles.input}
                            value={transactionIdInput}
                            onChangeText={setTransactionIdInput}
                            placeholder="TXN12345678"
                        />
                        <Button title="Mark Incentive as Paid" onPress={handleMarkPaid} color="#9c27b0" />
                    </View>
                )}
            </View>

            {/* Enlarge Image Modal */}
            {sale.bill_image && (
                <Modal visible={isImageModalVisible} transparent={true} animationType="fade" onRequestClose={() => setIsImageModalVisible(false)}>
                    <View style={styles.modalBackground}>
                        <TouchableOpacity style={styles.closeModalButton} onPress={() => setIsImageModalVisible(false)}>
                            <MaterialIcons name="close" size={32} color="#fff" />
                        </TouchableOpacity>
                        <Image source={{ uri: getImageUrl(sale.bill_image) }} style={styles.fullScreenImage} resizeMode="contain" />
                    </View>
                </Modal>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
        padding: 15,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    card: {
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 8,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        marginBottom: 30,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 15,
    },
    label: {
        fontSize: 12,
        color: "#888",
        marginBottom: 4,
    },
    value: {
        fontSize: 16,
        color: "#333",
        fontWeight: "600",
        marginBottom: 15,
    },
    imageContainer: {
        marginTop: 10,
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: "#eee",
        paddingTop: 15,
    },
    thumbnailButton: {
        width: "100%",
        height: 200,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative'
    },
    image: {
        width: "100%",
        height: "100%",
    },
    zoomOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    zoomText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeModalButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 10,
    },
    fullScreenImage: {
        width: '100%',
        height: '80%',
    },
    actionsContainer: {
        marginTop: 20,
        borderTopWidth: 1,
        borderTopColor: "#eee",
        paddingTop: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 15,
        backgroundColor: "#fafafa",
    },
    buttonRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    buttonWrapper: {
        flex: 1,
        marginHorizontal: 5,
    },
    markPaidContainer: {
        marginTop: 20,
    },
    gpayContainer: {
        marginTop: 10,
        marginBottom: 10,
    },
    gpayBadge: {
        backgroundColor: '#e8f5e9',
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#c8e6c9',
        marginTop: 5,
    },
    gpayValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2e7d32',
    },
});
