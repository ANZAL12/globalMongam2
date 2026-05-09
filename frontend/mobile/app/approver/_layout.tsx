import { Stack, useSegments } from "expo-router";
import AppHeader from "../../components/AppHeader";

export default function ApproverLayout() {
  const segments = useSegments();
  
  return (
    <Stack 
      screenOptions={{ 
        headerShown: true,
        headerBackTitleVisible: false,
        header: () => {
          // Check if we are in any detail page to show back button
          // User requested to remove arrow from review sale page, so we exclude 'sale' and 'duplicates'
          const isDetail = segments.some(s => ['promoter', 'details'].includes(s));
          return <AppHeader showBackButton={isDetail} />;
        }
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerTitle: "" }} />
    </Stack>
  );
}

