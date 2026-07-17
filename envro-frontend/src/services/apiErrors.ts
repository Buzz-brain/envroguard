export type ErrorCategory =
  | 'NETWORK'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'SERVER_ERROR'
  | 'UNKNOWN';

export type CategorizedError = {
  category: ErrorCategory;
  friendlyMessage: string;
  original: any;
};

const NETWORK_MESSAGES: Record<string, string> = {
  login: 'No internet connection. Please reconnect and try again.',
  register: 'Unable to complete registration. Check your internet connection and try again.',
  otp: "Couldn't verify your OTP. Please reconnect and try again.",
  report_submit: 'Unable to submit your hazard report. Please check your internet connection and try again.',
  notifications: "Couldn't load notifications. Pull down to refresh after reconnecting.",
  reports: 'Unable to load reports. Please try again.',
  dashboard: 'Unable to load dashboard data. Tap Retry.',
  audit: "Couldn't retrieve activity logs. Please reconnect and refresh.",
  profile: 'Unable to load profile. Please try again.',
  students: 'Unable to load students. Please try again.',
  faculties: 'Unable to load faculties. Please try again.',
  admins: 'Unable to load admins. Please try again.',
  default: 'No internet connection. Please check your connection and try again.',
};

const friendlyMessages: Record<ErrorCategory, (context?: string) => string> = {
  NETWORK: (ctx) => NETWORK_MESSAGES[ctx || 'default'] || NETWORK_MESSAGES.default,
  TIMEOUT: () => 'The request is taking longer than expected. Please check your connection and try again.',
  UNAUTHORIZED: () => 'Your session has expired. Please sign in again.',
  FORBIDDEN: () => 'You do not have permission to perform this action.',
  VALIDATION: () => 'Please check your input and try again.',
  NOT_FOUND: () => 'The requested resource could not be found.',
  SERVER_ERROR: () => 'Something went wrong on our end. Please try again later.',
  UNKNOWN: () => 'Something unexpected happened. Please try again.',
};

export function categorizeError(error: any): CategorizedError {
  if (error?.userMessage) {
    return { category: 'VALIDATION', friendlyMessage: error.userMessage, original: error };
  }

  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return { category: 'TIMEOUT', friendlyMessage: friendlyMessages.TIMEOUT(), original: error };
    }
    if (error.message === 'Network Error' || error.message?.includes('ENOTFOUND') || error.message?.includes('ERR_NETWORK')) {
      return { category: 'NETWORK', friendlyMessage: friendlyMessages.NETWORK(), original: error };
    }
  }

  const status = error.response?.status;
  if (status === 401) return { category: 'UNAUTHORIZED', friendlyMessage: friendlyMessages.UNAUTHORIZED(), original: error };
  if (status === 403) return { category: 'FORBIDDEN', friendlyMessage: friendlyMessages.FORBIDDEN(), original: error };
  if (status === 400) {
    const msg = error.response?.data?.message || error.response?.data?.errors?.[0]?.message || friendlyMessages.VALIDATION();
    return { category: 'VALIDATION', friendlyMessage: msg, original: error };
  }
  if (status === 404) return { category: 'NOT_FOUND', friendlyMessage: friendlyMessages.NOT_FOUND(), original: error };
  if (status && status >= 500) return { category: 'SERVER_ERROR', friendlyMessage: friendlyMessages.SERVER_ERROR(), original: error };

  if (error.message === 'Network request failed') {
    return { category: 'NETWORK', friendlyMessage: friendlyMessages.NETWORK(), original: error };
  }

  return { category: 'UNKNOWN', friendlyMessage: friendlyMessages.UNKNOWN(), original: error };
}

export function getFriendlyErrorMessage(error: any, context?: string): string {
  const categorized = categorizeError(error);
  if (categorized.category === 'NETWORK' && context) {
    return NETWORK_MESSAGES[context] || friendlyMessages.NETWORK(context);
  }
  return categorized.friendlyMessage;
}

export function isNetworkError(error: any): boolean {
  return categorizeError(error).category === 'NETWORK';
}

export function isTimeoutError(error: any): boolean {
  return categorizeError(error).category === 'TIMEOUT';
}
