import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserSettings {
  notificationSounds: boolean;
  toastSounds: boolean;
  vibration: boolean;
  enableSounds: boolean;
}

const DEFAULTS: UserSettings = {
  notificationSounds: true,
  toastSounds: true,
  vibration: true,
  enableSounds: true,
};

const SETTINGS_KEY = '@envroguard/user_settings';

let cached: UserSettings | null = null;

export const getSettings = async (): Promise<UserSettings> => {
  if (cached) return cached;
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) {
      cached = { ...DEFAULTS, ...JSON.parse(raw) };
      return cached!;
    }
  } catch {}
  cached = { ...DEFAULTS };
  return cached;
};

export const updateSettings = async (partial: Partial<UserSettings>): Promise<UserSettings> => {
  const current = await getSettings();
  const updated = { ...current, ...partial };
  cached = updated;
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
};

export const resetSettings = async (): Promise<UserSettings> => {
  cached = { ...DEFAULTS };
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULTS));
  } catch {}
  return { ...DEFAULTS };
};
