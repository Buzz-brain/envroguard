import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

const webStore = isWeb
  ? {
      getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
      setItem: (key: string, value: string) => Promise.resolve(localStorage.setItem(key, value)),
      deleteItem: (key: string) => Promise.resolve(localStorage.removeItem(key)),
    }
  : null;

export async function getItem(key: string): Promise<string | null> {
  if (isWeb) return webStore!.getItem(key);
  const { default: SecureStore } = await import('expo-secure-store');
  try { return await SecureStore.getItemAsync(key); } catch { return null; }
}

export async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) return webStore!.setItem(key, value);
  const { default: SecureStore } = await import('expo-secure-store');
  try { await SecureStore.setItemAsync(key, value); } catch {}
}

export async function deleteItem(key: string): Promise<void> {
  if (isWeb) return webStore!.deleteItem(key);
  const { default: SecureStore } = await import('expo-secure-store');
  try { await SecureStore.deleteItemAsync(key); } catch {}
}
