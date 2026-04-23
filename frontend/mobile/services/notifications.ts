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
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            // Silently fail or log, as the user might have denied it intentionally
            console.log('Push notification permission not granted');
            return null;
        }

        try {
            const projectId =
                Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

            const pushTokenString = (await Notifications.getExpoPushTokenAsync({
                projectId: projectId || "ec0dc904-cf1d-4073-b1f3-14c658b50ec8", 
            })).data;
            token = pushTokenString;
        } catch (e: any) {
            console.log("Error getting push token:", e);
        }
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}

export const syncPushTokenToBackend = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const token = await registerForPushNotificationsAsync();
        if (token) {
            const { error } = await supabase
                .from('users')
                .update({ expo_push_token: token })
                .eq('id', user.id);

            if (error) throw error;
            console.log('Push token synced to Supabase successfully');
        }
    } catch (error) {
        console.log('Error syncing push token:', error);
    }
};
