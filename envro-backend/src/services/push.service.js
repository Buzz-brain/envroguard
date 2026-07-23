import { DeviceToken } from '../modules/deviceToken/model.js';
import { logger } from '../utils/logger.js';

let Expo = null;

async function ensureExpo() {
  if (Expo === null) {
    try {
      const mod = await import('expo-server-sdk');
      Expo = mod.default || mod;
    } catch {
      Expo = undefined;
    }
  }
  return Expo;
}

let expoClient = null;

async function getClient() {
  const sdk = await ensureExpo();
  if (!sdk) return null;
  if (!expoClient) {
    expoClient = new sdk.Expo();
  }
  return expoClient;
}

export async function sendPushNotification(recipientId, recipientModel, title, message, data = {}) {
  const client = await getClient();
  if (!client) {
    logger.warn('expo-server-sdk not available, skipping push notification');
    return;
  }

  const sdk = await ensureExpo();

  try {
    const tokens = await DeviceToken.find({
      user: recipientId,
      userModel: recipientModel,
      isActive: true,
    });

    if (tokens.length === 0) return;

    const messages = tokens
      .filter(t => sdk.Expo.isExpoPushToken(t.token))
      .map(t => ({
        to: t.token,
        sound: 'default',
        title,
        body: message,
        data,
        priority: 'high',
        channelId: 'notification',
      }));

    if (messages.length === 0) return;

    const chunks = client.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        await client.sendPushNotificationsAsync(chunk);
      } catch (error) {
        logger.error('Failed to send push notification chunk', { error: error.message });
      }
    }
  } catch (error) {
    logger.error('Failed to send push notification', { error: error.message });
  }
}
