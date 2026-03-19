import { Stack } from "expo-router";

export default function PromoterLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen 
                name="details/[id]" 
                options={{ 
                    headerShown: true, 
                    title: "Announcement Details",
                    headerBackTitle: "Back"
                }} 
            />
        </Stack>
    );
}
