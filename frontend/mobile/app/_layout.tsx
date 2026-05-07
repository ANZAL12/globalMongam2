import { Stack, useRouter, useSegments } from "expo-router";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { GoogleSignInProvider } from "../context/GoogleSignInProvider";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { requestAllPermissions, syncPushTokenToBackend } from "../services/notifications";
import { supabase } from "../services/supabase";
import * as Notifications from 'expo-notifications';
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();
const ALLOWED_ROLES = new Set(["admin", "promoter", "approver"]);

type NotificationRouteData = {
  type?: string;
  announcement_id?: string;
  sale_id?: string;
};

function RootLayoutNav() {
  const { isAuthenticated, isLoading, role, mustChangePassword, logout } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [pendingNotificationData, setPendingNotificationData] = useState<NotificationRouteData | null>(null);

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
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      setPendingNotificationData(response.notification.request.content.data as NotificationRouteData);
    });

    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        setPendingNotificationData(response.notification.request.content.data as NotificationRouteData);
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!role || !pendingNotificationData) return;

    if (pendingNotificationData.type === 'announcement' && pendingNotificationData.announcement_id) {
      if (role === 'approver') {
        router.push(`/approver/details/${pendingNotificationData.announcement_id}` as any);
      } else if (role === 'promoter') {
        router.push(`/promoter/details/${pendingNotificationData.announcement_id}`);
      }
      setPendingNotificationData(null);
      return;
    }

    if (pendingNotificationData.type === 'sale_pending_approval' && pendingNotificationData.sale_id && role === 'approver') {
      router.push(`/approver/sale/${pendingNotificationData.sale_id}`);
      setPendingNotificationData(null);
    }
  }, [pendingNotificationData, role, router]);

  useEffect(() => {
    if (isLoading) return;

    // Allow OAuth callback routes; root must not redirect to /login while the browser hands off to the app.
    const segment0 = segments[0] as string | undefined;
    const inAuthGroup =
      segment0 === "login" ||
      segment0 === "oauth2redirect" ||
      segment0 === "oauthredirect";

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login
      router.replace('/login');
    } else if (isAuthenticated) {
      // Belt-and-suspenders guard: if role is ever invalid/null while authenticated,
      // clear session immediately and force login screen.
      if (!role || !ALLOWED_ROLES.has(role)) {
        void logout().finally(() => {
          router.replace('/login');
        });
        return;
      }

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
        } else if (role === 'approver') {
          if (segments[0] !== 'approver') {
            router.replace('/approver');
          }
        }
      }
    }
  }, [isAuthenticated, isLoading, segments, role, mustChangePassword, logout, router]);

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
      <GoogleSignInProvider>
        <StatusBar style="dark" />
        <RootLayoutNav />
      </GoogleSignInProvider>
    </AuthProvider>
  );
}
