export const BREVO_API_KEY = process.env.BREVO_API_KEY;
export const EMAIL_FROM = process.env.EMAIL_FROM || 'EnviroGuard <noreply@envroguard.com>';

export const verifyEmailConnection = async () => {
  if (!BREVO_API_KEY) {
    console.warn('[Email] BREVO_API_KEY not set. Emails will not be sent.');
  } else {
    console.log('[Email] Brevo API configured.');
  }
};
