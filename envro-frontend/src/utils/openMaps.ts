import { Linking, Platform } from 'react-native';
import { ToastService } from '../services/ToastService';

const googleMapsUrl = (latitude: number, longitude: number) =>
  `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

/**
 * Hands a location to the platform's maps app.
 *
 * Android uses the `geo:` scheme so the device's own maps app opens the pin
 * directly instead of bouncing through a browser; iOS and web keep the Google
 * Maps web URL (Maps app where installed, new browser tab otherwise).
 *
 * If `geo:` has no handler we fall back to the web URL, and if nothing can
 * open the location we tell the user rather than failing silently.
 */
export const openInMaps = async (latitude: number, longitude: number, label?: string) => {
  const query = `${latitude},${longitude}`;
  const webUrl = googleMapsUrl(latitude, longitude);
  const primaryUrl =
    Platform.OS === 'android'
      ? `geo:${query}?q=${query}${label ? `(${encodeURIComponent(label)})` : ''}`
      : webUrl;

  try {
    await Linking.openURL(primaryUrl);
  } catch {
    try {
      await Linking.openURL(webUrl);
    } catch {
      ToastService.error('Cannot Open Maps', 'No maps app is available to open this location.');
    }
  }
};
