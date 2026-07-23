import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

const RETRY_INTERVAL = 200;
const MAX_RETRIES = 15;

function waitForNavigation(): Promise<boolean> {
  return new Promise((resolve) => {
    if (navigationRef.isReady()) {
      resolve(true);
      return;
    }
    let retries = 0;
    const interval = setInterval(() => {
      retries++;
      if (navigationRef.isReady()) {
        clearInterval(interval);
        resolve(true);
      } else if (retries >= MAX_RETRIES) {
        clearInterval(interval);
        resolve(false);
      }
    }, RETRY_INTERVAL);
  });
}

export async function navigateToReport(reportId: string) {
  const ready = await waitForNavigation();
  if (!ready) return;
  navigationRef.navigate('ReportDetail', { reportId });
}

export async function navigateFromNotification(data: Record<string, any>) {
  const ready = await waitForNavigation();
  if (!ready) return;

  if (data?.reportId) {
    navigationRef.navigate('ReportDetail', { reportId: data.reportId });
    return;
  }

  try {
    navigationRef.navigate('Notifications');
  } catch {
    try {
      navigationRef.navigate('Dashboard', { screen: 'NotificationsList' });
    } catch {}
  }
}
