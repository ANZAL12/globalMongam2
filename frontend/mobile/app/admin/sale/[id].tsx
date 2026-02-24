import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Image, Button, Alert, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import api from "../../../services/api";

type SaleDetail = {
    id: number;
    promoter_email: string;
    product_name: string;
    bill_no: string | null;
    bill_amount: string;
    bill_image: string | null;
    status: string;
    incentive_amount: string | null;
    payment_status: string;
    created_at: string;
};

export default function SaleDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [sale, setSale] = useState<SaleDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [incentiveInput, setIncentiveInput] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        fetchSaleDetails();
    }, [id]);

    const fetchSaleDetails = async () => {
        try {
            // The API doesn't have a single-sale GET endpoint? 
            // The requirement says GET /sales/all/ and then show detail.
            // We will fetch from /sales/all/ and filter by ID.
            // Alternatively, the prompt implies there might be one. 
            // Let's fetch all and find the single one. This handles state beautifully.
            const res = await api.get("/sales/all/");
            const found = res.data.find((s: SaleDetail) => s.id.toString() === id);
            if (found) {
                setSale(found);
                setIncentiveInput(found.incentive_amount || "");
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
            await api.patch(`/sales/${id}/approve/`, {
                status: "approved",
                incentive_amount: parseFloat(incentiveInput)
            });
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
                            await api.patch(`/sales/${id}/reject/`, {
                                status: "rejected"
                            });
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
            await api.patch(`/sales/${id}/mark-paid/`);
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

    return (
        <ScrollView style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.label}>Promoter</Text>
                <Text style={styles.value}>{sale.promoter_email}</Text>

                <Text style={styles.label}>Product Name</Text>
                <Text style={styles.value}>{sale.product_name}</Text>

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
                        <Image source={{ uri: sale.bill_image }} style={styles.image} resizeMode="contain" />
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
                        <Button title="Mark Incentive as Paid" onPress={handleMarkPaid} color="#9c27b0" />
                    </View>
                )}

            </View>
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
    image: {
        width: "100%",
        height: 300,
        borderRadius: 8,
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
    }
});
