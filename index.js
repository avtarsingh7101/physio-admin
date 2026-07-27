import { registerRootComponent } from 'expo';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import App from './App';

// Background notification handler — fires even when app is killed
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Background message handler for when app is not in foreground
Notifications.registerTaskAsync('BACKGROUND_NOTIFICATION_TASK');
Notifications.addNotificationResponseReceivedListener(response => {
  const data = response.notification.request.content.data;
  // Optionally open appointment detail
});

registerRootComponent(App);
