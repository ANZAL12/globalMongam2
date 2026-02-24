import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import api from './api';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

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
            Alert.alert('Permission Denied', 'Failed to get push token for push notification because permissions were not granted!');
            return null;
        }

        // Learn more about projectId:
        // https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
        try {
            const projectId =
                Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

            const pushTokenString = (await Notifications.getExpoPushTokenAsync({
                projectId: projectId || "612035335688", // Defaulting if not in app.json
            })).data;
            token = pushTokenString;
        } catch (e: any) {
            Alert.alert("Token Generation Error", String(e.message || e));
            console.log("Error getting token:", e);
        }
    } else {
        Alert.alert("Physical Device Required", "Must use physical device for Push Notifications. Simulators/Web will not work.");
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}

export const syncPushTokenToBackend = async () => {
    try {
        const token = await registerForPushNotificationsAsync();
        if (token) {
            await api.post('/auth/update-push-token/', { expo_push_token: token });
            console.log('Push token synced to backend successfully:', token);
        }
    } catch (error) {
        console.log('Error syncing push token:', error);
    }
};
