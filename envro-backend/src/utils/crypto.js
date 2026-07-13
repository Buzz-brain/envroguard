import crypto from 'crypto';
import { config } from '../config/index.js';

export const generateOTP = () => {
  const length = config.otp.length;
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return crypto.randomInt(min, max + 1).toString();
};

export const hashOTP = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

export const compareOTP = (otp, hashed) => {
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
  return otpHash === hashed;
};
