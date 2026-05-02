import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import * as WebBrowser from "expo-web-browser";

/**
 * OAuth return path for URLs like global-agencies://oauth2redirect?code=...
 * Route must exist so Expo Router does not show "Unmatched Route".
 */
export default function OAuth2Redirect() {
    useEffect(() => {
        WebBrowser.maybeCompleteAuthSession();
    }, []);

    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f0f2f5" }}>
            <ActivityIndicator size="large" color="#1976d2" />
        </View>
    );
}
