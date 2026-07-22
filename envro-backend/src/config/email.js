import nodemailer from 'nodemailer';
import { config } from './index.js';

export const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
  connectionTimeout: 10000,
  greetingTimeout: 5000,
  socketTimeout: 10000,
});

export const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
  } catch (error) {
    console.warn(
      '[Email] SMTP connection could not be verified. Emails will not be sent until credentials are configured.'
    );
  }
};
