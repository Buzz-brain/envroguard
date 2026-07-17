import Toast from 'react-native-toast-message';
import { SoundService } from './SoundService';
import { hapticFeedback } from './HapticService';

type ToastType = 'success' | 'error' | 'warning' | 'info';

const colorMap: Record<ToastType, string> = {
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  info: '#2563EB',
};

const show = (type: ToastType, title: string, message?: string) => {
  Toast.show({
    type,
    text1: title,
    text2: message,
    visibilityTime: 3000,
    position: 'top',
    topOffset: 60,
  });

  const soundMap: Record<ToastType, () => void> = {
    success: () => SoundService.success(),
    error: () => SoundService.error(),
    warning: () => SoundService.warning(),
    info: () => SoundService.info(),
  };
  soundMap[type]();

  const hapticMap: Record<ToastType, () => void> = {
    success: () => hapticFeedback.success(),
    error: () => hapticFeedback.error(),
    warning: () => hapticFeedback.warning(),
    info: () => hapticFeedback.light(),
  };
  hapticMap[type]();
};

export const ToastService = {
  success: (title: string, message?: string) => show('success', title, message),
  error: (title: string, message?: string) => show('error', title, message),
  warning: (title: string, message?: string) => show('warning', title, message),
  info: (title: string, message?: string) => show('info', title, message),
};
