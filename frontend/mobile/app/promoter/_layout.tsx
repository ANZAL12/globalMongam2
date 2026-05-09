import { Stack } from "expo-router";
import AppHeader from "../../components/AppHeader";

export default function PromoterLayout() {
    return (
        <Stack 
            screenOptions={{ 
                headerShown: true,
                headerBackTitleVisible: false,
                header: ({ options, route }) => {
                    const showBack = route.name !== "(tabs)";
                    return <AppHeader showBackButton={showBack} />;
                }
            }}
        >
            <Stack.Screen name="(tabs)" options={{ headerTitle: "" }} />
        </Stack>
    );
}
