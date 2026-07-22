import { BREVO_API_KEY, EMAIL_FROM } from '../config/email.js';
import { logger } from '../utils/logger.js';

async function sendEmail({ to, subject, html }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: 'EnviroGuard', email: EMAIL_FROM.replace(/^.*<(.+)>$/, '$1') },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo API ${res.status}: ${err}`);
  }
}

const OTP_EMAIL_TEMPLATE = (otp, purpose) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #2d6a4f; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">EnviroGuard</h1>
              <p style="color: #b7e4c7; margin: 8px 0 0; font-size: 14px;">Environmental Hazard Alert System</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 16px; font-size: 20px;">
                ${purpose === 'registration' ? 'Complete Your Registration' : 'Reset Your Password'}
              </h2>
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Use the OTP below to ${purpose === 'registration' ? 'verify your identity and create your account' : 'reset your password'}. This code expires in <strong>10 minutes</strong>.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #f0faf4; border: 2px dashed #2d6a4f; border-radius: 8px; text-align: center; padding: 20px;">
                    <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #2d6a4f;">${otp}</span>
                  </td>
                </tr>
              </table>
              <p style="color: #999999; font-size: 13px; margin: 24px 0 0; line-height: 1.5;">
                If you did not request this, please ignore this email. Do not share this OTP with anyone.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                &copy; ${new Date().getFullYear()} EnviroGuard. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export const sendOTPEmail = async (to, otp, purpose = 'registration') => {
  try {
    await sendEmail({
      to,
      subject: `EnviroGuard - ${purpose === 'registration' ? 'Registration' : 'Password Reset'} OTP`,
      html: OTP_EMAIL_TEMPLATE(otp, purpose),
    });

    logger.info(`OTP email sent to ${to}`, { purpose });
    return true;
  } catch (error) {
    logger.error(`Failed to send OTP email to ${to}`, { error: error.message });
    if (process.env.NODE_ENV === 'development') {
      logger.warn(`[DEV FALLBACK] OTP for ${to}: ${otp}`);
    }
    return false;
  }
};

const INVITE_EMAIL_TEMPLATE = (name) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #2d6a4f; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">EnviroGuard</h1>
              <p style="color: #b7e4c7; margin: 8px 0 0; font-size: 14px;">Environmental Hazard Alert System</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 16px; font-size: 20px;">You've been added as an Admin!</h2>
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                Hello ${name},
              </p>
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                An administrator has added you to the <strong>EnviroGuard</strong> system. To get started, you need to complete your account setup by choosing a password.
              </p>
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Open the app, go to <strong>Admin Registration</strong>, enter the email address this invitation was sent to, and follow the prompts to set up your password.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color: #2d6a4f; border-radius: 6px; padding: 12px 32px;">
                          <a href="${process.env.APP_URL || '#'}" style="color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold;">Go to EnviroGuard</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="color: #999999; font-size: 13px; margin: 24px 0 0; line-height: 1.5;">
                If you were not expecting this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                &copy; ${new Date().getFullYear()} EnviroGuard. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export const sendInviteEmail = async (to, name) => {
  try {
    await sendEmail({
      to,
      subject: 'EnviroGuard - You\'ve been added as an Admin',
      html: INVITE_EMAIL_TEMPLATE(name),
    });

    logger.info(`Invite email sent to ${to}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send invite email to ${to}`, { error: error.message });
    if (process.env.NODE_ENV === 'development') {
      logger.warn(`[DEV FALLBACK] Invite email would have been sent to ${to}`);
    }
  }
};
