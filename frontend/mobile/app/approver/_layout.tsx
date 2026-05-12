import { Stack, useSegments } from "expo-router";
import AppHeader from "../../components/AppHeader";

export default function ApproverLayout() {
  const segments = useSegments();
  
  return (
    <Stack 
      screenOptions={{ 
        headerShown: true,
        header: () => {
          // Check if we are in any detail page to show back button
          // User requested to remove arrow from review sale page and promoter page
          const isDetail = segments.some(s => ['details'].includes(s));
          return <AppHeader showBackButton={isDetail} />;
        }
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerTitle: "" }} />
    </Stack>
  );
}

