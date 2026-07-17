import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getSettings } from './settings';

const playToastSound = async (_type: 'success' | 'error' | 'warning' | 'info') => {
  const settings = await getSettings();
  if (!settings.enableSounds || !settings.toastSounds) return;

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('toast', {
        name: 'Toast Sounds',
        importance: Notifications.AndroidImportance.LOW,
        vibrationPattern: [0],
        lightColor: '#059669',
      });
    } catch {}
  }
};

const playNotificationSound = async (priority?: 'low' | 'medium' | 'high') => {
  const settings = await getSettings();
  if (!settings.enableSounds || !settings.notificationSounds) return;

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('notification', {
        name: 'Notification Sounds',
        importance: priority === 'high'
          ? Notifications.AndroidImportance.HIGH
          : priority === 'medium'
          ? Notifications.AndroidImportance.DEFAULT
          : Notifications.AndroidImportance.LOW,
        vibrationPattern: [0, 100, 50, 100],
        lightColor: '#059669',
        sound: 'default',
      });
    } catch {}
  }
};

export const SoundService = {
  playToastSound,
  playNotificationSound,

  success: () => playToastSound('success'),
  error: () => playToastSound('error'),
  warning: () => playToastSound('warning'),
  info: () => playToastSound('info'),

  notify: (priority?: 'low' | 'medium' | 'high') => playNotificationSound(priority),
};
