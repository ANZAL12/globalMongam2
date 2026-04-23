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

export const syncPushTokenToBackend = async () => {
    try {
        console.log('Push Sync: Checking authentication...');
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            console.log('Push Sync: No authenticated user found. Skipping.');
            return;
        }

        console.log(`Push Sync: User found (${user.email}). Requesting token...`);
        const token = await registerForPushNotificationsAsync();
        
        if (token) {
            console.log('Push Sync: Token generated successfully:', token);
            console.log('Push Sync: Updating Supabase users table...');
            
            const { data, error } = await supabase
                .from('users')
                .update({ expo_push_token: token })
                .eq('id', user.id)
                .select();

            if (error) {
                console.error('Push Sync: Supabase Update Error:', error.message);
            } else {
                console.log('Push Sync: SUCCESS! Token saved to Supabase.', data);
            }
        } else {
            console.warn('Push Sync: Failed to generate a token. Are you on a physical device?');
        }
    } catch (error: any) {
        console.error('Push Sync: Critical Error:', error.message || error);
    }
};
