import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../contexts/ThemeContext';
import { typography, spacing } from '../constants';
import { notificationsApi } from '../api/notifications';

// Student screens
import StudentHome from '../screens/student/HomeScreen';
import ReportHazard from '../screens/student/ReportHazardScreen';
import MyReports from '../screens/student/MyReportsScreen';
import StudentReportDetail from '../screens/student/ReportDetailScreen';
import StudentNotifications from '../screens/student/NotificationsScreen';
import StudentProfile from '../screens/student/ProfileScreen';

// Admin screens
import AdminDashboard from '../screens/admin/DashboardScreen';
import AdminReports from '../screens/admin/ReportsScreen';
import AdminReportDetail from '../screens/admin/AdminReportDetailScreen';
import AdminStudents from '../screens/admin/StudentsScreen';
import AdminFaculties from '../screens/admin/FacultiesScreen';
import AdminAdmins from '../screens/admin/AdminsScreen';
import AdminSettings from '../screens/admin/SettingsScreen';
import AdminNotifications from '../screens/student/NotificationsScreen';
import AuditLogs from '../screens/admin/AuditLogsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Small local stacks so each tab can push screens
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={StudentHome} />
      <Stack.Screen name="ReportHazard" component={ReportHazard} />
      <Stack.Screen name="ReportDetail" component={StudentReportDetail} />
    </Stack.Navigator>
  );
}

function ReportsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyReportsList" component={MyReports} />
      <Stack.Screen name="ReportDetail" component={StudentReportDetail} />
    </Stack.Navigator>
  );
}

function AdminReportsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminReportsList" component={AdminReports} />
      <Stack.Screen name="ReportDetail" component={AdminReportDetail} />
    </Stack.Navigator>
  );
}

function AdminDashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardMain" component={AdminDashboard} />
      <Stack.Screen name="ReportDetail" component={AdminReportDetail} />
      <Stack.Screen name="NotificationsList" component={AdminNotifications} />
      <Stack.Screen name="AuditLogs" component={AuditLogs} />
    </Stack.Navigator>
  );
}

function StudentsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StudentsList" component={AdminStudents} />
    </Stack.Navigator>
  );
}

function FacultiesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FacultiesList" component={AdminFaculties} />
    </Stack.Navigator>
  );
}

function AdminsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminsList" component={AdminAdmins} />
    </Stack.Navigator>
  );
}

function AdminSettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsMain" component={AdminSettings} />
    </Stack.Navigator>
  );
}

function NotifStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="NotificationsList" component={StudentNotifications} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={StudentProfile} />
    </Stack.Navigator>
  );
}

function NotifIcon({ size, color }: { size: number; color: string }) {
  const colors = useColors();
  const [unread, setUnread] = useState(0);

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const { data } = await notificationsApi.getStats();
        if (data.success) setUnread(data.data?.unread ?? data.data?.unreadCount ?? 0);
      } catch {}
    })();
  }, []));

  return (
    <View>
      <Ionicons name="notifications" size={size} color={color} />
      {unread > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.danger }]}>
          <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      )}
    </View>
  );
}

function reportIcon(size: number, color: string) {
  return <Ionicons name="document-text" size={size} color={color} />;
}

export function StudentTabs() {
  const colors = useColors();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { borderTopColor: colors.borderLight, paddingBottom: 4, height: 56 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as const },
      }}
    >
      <Tab.Screen name="Home" component={HomeStack}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }} />
      <Tab.Screen name="Report" component={ReportHazard}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="camera" size={size} color={color} /> }} />
      <Tab.Screen name="Reports" component={ReportsStack}
        options={{ tabBarLabel: 'My Reports', tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} /> }} />
      <Tab.Screen name="Notifications" component={NotifStack}
        options={{ tabBarIcon: (props) => <NotifIcon size={props.size} color={props.color} /> }} />
      <Tab.Screen name="Profile" component={ProfileStack}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}

export function DepartmentAdminTabs() {
  const colors = useColors();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { borderTopColor: colors.borderLight, paddingBottom: 4, height: 56 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as const },
      }}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboardStack}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }} />
      <Tab.Screen name="Reports" component={AdminReportsStack}
        options={{ tabBarIcon: ({ color, size }) => reportIcon(size, color) }} />
      <Tab.Screen name="Students" component={StudentsStack}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} /> }} />
      <Tab.Screen name="Settings" component={AdminSettingsStack}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}

export function FacultyAdminTabs() {
  const colors = useColors();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { borderTopColor: colors.borderLight, paddingBottom: 4, height: 56 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as const },
      }}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboardStack}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }} />
      <Tab.Screen name="Reports" component={AdminReportsStack}
        options={{ tabBarIcon: ({ color, size }) => reportIcon(size, color) }} />
      <Tab.Screen name="Students" component={StudentsStack}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} /> }} />
      <Tab.Screen name="Faculties" component={FacultiesStack}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="business" size={size} color={color} /> }} />
      <Tab.Screen name="Admins" component={AdminsStack}
        options={{ tabBarLabel: 'Dept Admins', tabBarIcon: ({ color, size }) => <Ionicons name="shield" size={size} color={color} /> }} />
      <Tab.Screen name="Settings" component={AdminSettingsStack}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}

export function EnvironmentalAdminTabs() {
  const colors = useColors();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { borderTopColor: colors.borderLight, paddingBottom: 4, height: 56 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as const },
      }}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboardStack}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }} />
      <Tab.Screen name="Reports" component={AdminReportsStack}
        options={{ tabBarIcon: ({ color, size }) => reportIcon(size, color) }} />
      <Tab.Screen name="Faculties" component={FacultiesStack}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="business" size={size} color={color} /> }} />
      <Tab.Screen name="Admins" component={AdminsStack}
        options={{ tabBarLabel: 'Admins', tabBarIcon: ({ color, size }) => <Ionicons name="shield" size={size} color={color} /> }} />
      <Tab.Screen name="Settings" component={AdminSettingsStack}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    ...typography.caption,
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
