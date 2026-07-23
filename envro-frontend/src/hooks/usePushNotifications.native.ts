import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { deviceTokensApi } from '../api/deviceTokens';
import { navigateFromNotification } from '../utils/navigation';

let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch {}

// Show notifications as banners even when app is in foreground
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureNotificationChannels() {
  if (Platform.OS !== 'android' || !Notifications) return;
  try {
    await Notifications.setNotificationChannelAsync('notification', {
      name: 'Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 100, 50, 100],
      lightColor: '#059669',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('toast', {
      name: 'Toast Sounds',
      importance: Notifications.AndroidImportance.LOW,
      vibrationPattern: [0],
      lightColor: '#059669',
    });
  } catch {}
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (!user || !Notifications) return;

    let isMounted = true;

    async function register() {
      try {
        await ensureNotificationChannels();
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;

        const tokenData = await Notifications.getExpoPushTokenAsync();
        const token = tokenData.data;

        if (!isMounted) return;
        setExpoPushToken(token);

        const platform = Platform.OS === 'web' ? 'web' : Platform.OS === 'ios' ? 'ios' : 'android';
        await deviceTokensApi.register(token, platform);
      } catch {}
    }

    register();

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {});

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response.notification.request.content.data;
      navigateFromNotification(data);
    });

    return () => {
      isMounted = false;
      if (Notifications) {
        if (notificationListener.current) Notifications.removeNotificationSubscription(notificationListener.current);
        if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user?.id]);

  return { expoPushToken };
}
