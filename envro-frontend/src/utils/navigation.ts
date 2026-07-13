import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

export function navigateToReport(reportId: string) {
  if (navigationRef.isReady()) {
    navigationRef.navigate('ReportDetail', { reportId });
  }
}
