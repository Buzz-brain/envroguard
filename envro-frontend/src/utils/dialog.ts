import { Alert, Platform } from 'react-native';

export function showAlert(title: string, message?: string) {
  if (Platform.OS === 'web') {
    (globalThis as any).alert?.(`${title}${message ? `\n\n${message}` : ''}`);
    return;
  }
  Alert.alert(title, message);
}

export function showConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText = 'Confirm'
) {
  if (Platform.OS === 'web') {
    const ok = (globalThis as any).confirm?.(`${title}\n\n${message}`);
    if (ok) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmText, onPress: onConfirm },
  ]);
}
