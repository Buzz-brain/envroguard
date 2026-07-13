import { DeviceToken } from '../modules/deviceToken/model.js';
import { logger } from '../utils/logger.js';

let Expo;
try {
  Expo = require('expo-server-sdk');
} catch {
  Expo = null;
}

let expoClient = null;

function getClient() {
  if (!expoClient && Expo) {
    expoClient = new Expo.Expo();
  }
  return expoClient;
}

export async function sendPushNotification(recipientId, recipientModel, title, message, data = {}) {
  if (!getClient()) {
    logger.warn('expo-server-sdk not available, skipping push notification');
    return;
  }

  try {
    const tokens = await DeviceToken.find({
      user: recipientId,
      userModel: recipientModel,
      isActive: true,
    });

    if (tokens.length === 0) return;

    const messages = tokens
      .filter(t => Expo.Expo.isExpoPushToken(t.token))
      .map(t => ({
        to: t.token,
        sound: 'default',
        title,
        body: message,
        data,
      }));

    if (messages.length === 0) return;

    const chunks = getClient().chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        await getClient().sendPushNotificationsAsync(chunk);
      } catch (error) {
        logger.error('Failed to send push notification chunk', { error: error.message });
      }
    }
  } catch (error) {
    logger.error('Failed to send push notification', { error: error.message });
  }
}
