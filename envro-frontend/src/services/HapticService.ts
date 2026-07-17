import * as Haptics from 'expo-haptics';
import { getSettings } from './settings';

export const hapticFeedback = {
  light: async () => {
    const settings = await getSettings();
    if (!settings.vibration) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  },

  medium: async () => {
    const settings = await getSettings();
    if (!settings.vibration) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  },

  heavy: async () => {
    const settings = await getSettings();
    if (!settings.vibration) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
  },

  success: async () => {
    const settings = await getSettings();
    if (!settings.vibration) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  },

  error: async () => {
    const settings = await getSettings();
    if (!settings.vibration) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {}
  },

  warning: async () => {
    const settings = await getSettings();
    if (!settings.vibration) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
  },

  selection: async () => {
    const settings = await getSettings();
    if (!settings.vibration) return;
    try {
      await Haptics.selectionAsync();
    } catch {}
  },
};
