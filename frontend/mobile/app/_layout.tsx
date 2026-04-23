import { Stack, useRouter, useSegments } from "expo-router";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { requestAllPermissions, syncPushTokenToBackend } from "../services/notifications";
import { supabase } from "../services/supabase";
import * as Notifications from 'expo-notifications';

function RootLayoutNav() {
  const { isAuthenticated, isLoading, role, mustChangePassword } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Re-sync whenever the user logs in or out
  useEffect(() => {
    const checkUserAndSync = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('Root: User detected, syncing push token...');
        await requestAllPermissions();
        await syncPushTokenToBackend();
      }
    };
    
    checkUserAndSync();

    // Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        syncPushTokenToBackend();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Listener for notifications received while the app is foregrounded
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notification Received in Foreground:', notification);
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'login';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login
      router.replace('/login');
    } else if (isAuthenticated) {
      if (mustChangePassword) {
        if (segments[0] !== 'change-password') {
          router.replace('/change-password');
        }
      } else {
        // Role-based routing
        if (role === 'admin') {
          if (segments[0] !== 'admin') {
            router.replace('/admin');
          }
        } else if (role === 'promoter') {
          if (segments[0] !== 'promoter') {
            router.replace('/promoter');
          }
        }
      }
    }
  }, [isAuthenticated, isLoading, segments, role, mustChangePassword]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function Layout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootLayoutNav />
    </AuthProvider>
  );
}
