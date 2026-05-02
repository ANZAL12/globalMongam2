import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import * as WebBrowser from "expo-web-browser";

/**
 * OAuth return path for Expo Google default: {applicationId}:/oauthredirect
 */
export default function OAuthRedirect() {
    useEffect(() => {
        WebBrowser.maybeCompleteAuthSession();
    }, []);

    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f0f2f5" }}>
            <ActivityIndicator size="large" color="#1976d2" />
        </View>
    );
}
