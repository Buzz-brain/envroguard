import { DeviceToken } from '../modules/deviceToken/model.js';
import { logger } from '../utils/logger.js';

let ExpoClass = undefined;

async function ensureExpo() {
  if (ExpoClass === undefined) {
    try {
      const mod = await import('expo-server-sdk');
      ExpoClass = mod.Expo || mod.default?.Expo || mod.default;
    } catch {
      ExpoClass = null;
    }
  }
  return ExpoClass;
}

let expoClient = null;

async function getClient() {
  const Expo = await ensureExpo();
  if (!Expo) return null;
  if (!expoClient) {
    expoClient = new Expo();
  }
  return expoClient;
}

export async function sendPushNotification(recipientId, recipientModel, title, message, data = {}) {
  const client = await getClient();
  const Expo = await ensureExpo();

  if (!client || !Expo) {
    logger.warn('[Push] expo-server-sdk not available, skipping push notification');
    return;
  }

  try {
    const tokens = await DeviceToken.find({
      user: recipientId,
      userModel: recipientModel,
      isActive: true,
    });

    logger.info(`[Push] Found ${tokens.length} active device token(s) for ${recipientModel}:${recipientId}`);

    if (tokens.length === 0) return;

    const validTokens = tokens.filter(t => Expo.isExpoPushToken(t.token));
    const invalidTokens = tokens.filter(t => !Expo.isExpoPushToken(t.token));

    if (invalidTokens.length > 0) {
      logger.warn(`[Push] ${invalidTokens.length} invalid token(s) skipped`);
    }

    const messages = validTokens
      .map(t => ({
        to: t.token,
        sound: 'default',
        title,
        body: message,
        data,
        priority: 'high',
        channelId: 'notification',
      }));

    if (messages.length === 0) {
      logger.warn('[Push] No valid Expo push tokens after filtering');
      return;
    }

    logger.info(`[Push] Sending ${messages.length} push message(s) via Expo`);

    const chunks = client.chunkPushNotifications(messages);
    for (let i = 0; i < chunks.length; i++) {
      try {
        const receipts = await client.sendPushNotificationsAsync(chunks[i]);
        logger.info(`[Push] Chunk ${i + 1}/${chunks.length} sent. Receipts: ${JSON.stringify(receipts)}`);
      } catch (error) {
        logger.error(`[Push] Chunk ${i + 1}/${chunks.length} failed: ${error.message}`);
      }
    }
  } catch (error) {
    logger.error(`[Push] Failed: ${error.message}`);
  }
}
