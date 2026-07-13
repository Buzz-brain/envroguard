import { DeviceToken } from './model.js';

export const registerTokenService = async (userId, userModel, token, platform = 'android') => {
  const existing = await DeviceToken.findOne({ token });
  if (existing) {
    if (existing.user.toString() !== userId.toString()) {
      existing.user = userId;
      existing.userModel = userModel;
      existing.isActive = true;
      await existing.save();
    }
    return existing;
  }

  const deviceToken = await DeviceToken.create({
    user: userId,
    userModel,
    token,
    platform,
  });

  return deviceToken;
};

export const unregisterTokenService = async (token) => {
  await DeviceToken.findOneAndUpdate({ token }, { isActive: false });
};

export const getUserTokensService = async (userId) => {
  return DeviceToken.find({ user: userId, isActive: true });
};

export const getTokensForRecipientService = async (recipientId, recipientModel) => {
  return DeviceToken.find({
    user: recipientId,
    userModel: recipientModel,
    isActive: true,
  });
};
