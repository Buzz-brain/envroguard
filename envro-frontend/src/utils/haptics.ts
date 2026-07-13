let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch {}

export function impactLight() {
  if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function impactMedium() {
  if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function impactHeavy() {
  if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
}

export function notificationSuccess() {
  if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function notificationError() {
  if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}

export function selectionFeedback() {
  if (Haptics) Haptics.selectionAsync().catch(() => {});
}
