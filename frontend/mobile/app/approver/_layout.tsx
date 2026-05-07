import { Stack } from "expo-router";

export default function ApproverLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="sale/[id]" />
      <Stack.Screen name="details/[id]" />
    </Stack>
  );
}

