import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/**
 * Requests all necessary permissions for the app on startup.
 */
export async function requestAllPermissions() {
    try {
        // 1. Push Notifications
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        if (existingStatus !== 'granted') {
            await Notifications.requestPermissionsAsync();
        }

        // 2. Camera
        const { status: cameraStatus } = await ImagePicker.getCameraPermissionsAsync();
        if (cameraStatus !== 'granted') {
            await ImagePicker.requestCameraPermissionsAsync();
        }

        // 3. Media Library
        const { status: libraryStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
        if (libraryStatus !== 'granted') {
            await ImagePicker.requestMediaLibraryPermissionsAsync();
        }

        console.log('All initial permissions requested.');
    } catch (error) {
        console.error('Error requesting permissions:', error);
    }
}

export async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    if (Device.isDevice) {
        console.log('Push: Checking device permissions...');
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            console.log('Push: Requesting new permissions...');
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.warn('Push: Permission DENIED by user!');
            return null;
        }

        try {
            const projId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId ?? "ec0dc904-cf1d-4073-b1f3-14c658b50ec8";
            console.log('Push: Using Project ID:', projId);

            const pushTokenString = (await Notifications.getExpoPushTokenAsync({
                projectId: projId, 
            })).data;
            
            console.log('Push: SUCCESS! Token is:', pushTokenString);
            token = pushTokenString;
        } catch (e: any) {
            console.error('Push: EXPO ERROR during token fetch:', e.message || e);
        }
    } else {
        console.warn('Push: SKIPPED (Not a physical device)');
    }

    return token;
}

export async function registerForFirebasePushTokenAsync() {
    if (!Device.isDevice) {
        console.warn('FCM: SKIPPED (Not a physical device)');
        return null;
    }

    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.warn('FCM: Permission DENIED by user!');
            return null;
        }

        const devicePushToken = await Notifications.getDevicePushTokenAsync();
        const token = typeof devicePushToken?.data === 'string' ? devicePushToken.data : null;
        if (!token) {
            console.warn('FCM: No native device push token returned');
            return null;
        }

        console.log('FCM: SUCCESS! Native token acquired.');
        return token;
    } catch (error: any) {
        console.error('FCM: Failed to fetch native token:', error?.message || error);
        return null;
    }
}

export const syncPushTokenToBackend = async () => {
    try {
        console.log('Push Sync: Checking authentication...');
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            console.log('Push Sync: No authenticated user found. Skipping.');
            return;
        }

        // Check if user is active
        const { data: profile } = await supabase
            .from('users')
            .select('is_active')
            .eq('id', user.id)
            .single();

        if (!profile?.is_active) {
            console.log('Push Sync: User is not active. Skipping token sync.');
            return;
        }

        console.log(`Push Sync: User found (${user.email}). Requesting Expo/FCM tokens...`);
        const expoToken = await registerForPushNotificationsAsync();
        const fcmToken = await registerForFirebasePushTokenAsync();

        if (expoToken || fcmToken) {
            const updatePayload: Record<string, string> = {};
            if (expoToken) updatePayload.expo_push_token = expoToken;
            if (fcmToken) updatePayload.fcm_web_push_token = fcmToken;

            console.log('Push Sync: Updating Supabase users table...');
            const { data, error } = await supabase
                .from('users')
                .update(updatePayload)
                .eq('id', user.id)
                .select();

            if (error) {
                console.error('Push Sync: Supabase Update Error:', error.message);
            } else {
                console.log('Push Sync: SUCCESS! Tokens saved to Supabase.', data);
            }
        } else {
            console.warn('Push Sync: Failed to generate Expo/FCM token. Are you on a physical device?');
        }
    } catch (error: any) {
        console.error('Push Sync: Critical Error:', error.message || error);
    }
};

type SendAnnouncementPushParams = {
    announcementId: string;
    title: string;
    description: string;
    targetUserIds: string[];
};

export const sendAnnouncementPushNotifications = async ({
    announcementId,
    title,
    description,
    targetUserIds,
}: SendAnnouncementPushParams) => {
    try {
        if (!targetUserIds.length) {
            return { sent: 0, skipped: 0 };
        }

        const { data: users, error } = await supabase
            .from('users')
            .select('id, expo_push_token')
            .in('id', targetUserIds)
            .eq('is_active', true);

        if (error) throw error;

        const recipients = (users || [])
            .map((u) => u.expo_push_token)
            .filter(
                (token): token is string =>
                    Boolean(token) &&
                    (token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken'))
            );

        if (!recipients.length) {
            return { sent: 0, skipped: targetUserIds.length };
        }

        const bodyText = (description || 'You have a new announcement.').slice(0, 100);
        const messages = recipients.map((token) => ({
            to: token,
            title: title || 'New announcement',
            body: bodyText,
            sound: 'default',
            priority: 'high',
            channelId: 'default',
            data: {
                type: 'announcement',
                announcement_id: announcementId,
            },
        }));

        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messages),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Expo push API failed (${response.status}): ${text}`);
        }

        return { sent: recipients.length, skipped: Math.max(targetUserIds.length - recipients.length, 0) };
    } catch (error) {
        console.error('Push send failed:', error);
        throw error;
    }
};

export const sendAnnouncementPushViaFirebase = async ({
    announcementId,
    targetUserIds,
}: {
    announcementId: string;
    targetUserIds: string[];
}) => {
    const { data, error } = await supabase.functions.invoke('send-web-announcement-push', {
        body: {
            announcementId,
            targetIds: targetUserIds,
        },
    });

    if (error) throw error;
    return data;
};
