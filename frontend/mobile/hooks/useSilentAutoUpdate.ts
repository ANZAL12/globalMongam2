import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Hook for silent, automatic background OTA updates.
 * - In production builds, checks for new updates on launch and when app resumes from background.
 * - Downloads updates silently without prompting the user.
 * - Automatically reloads the app to apply the newest update once downloaded.
 */
export function useSilentAutoUpdate() {
  useEffect(() => {
    // Only run in standalone release builds, never in local Expo Go development
    if (__DEV__ || !Updates.isEnabled) return;

    let isUpdating = false;

    const performSilentUpdate = async () => {
      if (isUpdating) return;

      try {
        const check = await Updates.checkForUpdateAsync();
        if (check.isAvailable) {
          isUpdating = true;
          await Updates.fetchUpdateAsync();
          // Silently reload the app to apply the update without any alert or prompt
          await Updates.reloadAsync();
        }
      } catch (error) {
        // Silently log; does not interrupt the user if offline or network fails
        console.log('[AutoUpdate] Silent check skipped or failed:', error);
      } finally {
        isUpdating = false;
      }
    };

    // 1. Check once on component mount
    void performSilentUpdate();

    // 2. Check whenever user switches back to the app from background
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        void performSilentUpdate();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
}
