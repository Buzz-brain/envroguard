import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from '../utils/navigation';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { ThemeProvider, useColors } from '../contexts/ThemeContext';

// Auth screens
import LandingScreen from '../screens/auth/LandingScreen';
import RoleSelectScreen from '../screens/auth/RoleSelectScreen';
import StudentLoginScreen from '../screens/auth/StudentLoginScreen';
import AdminLoginScreen from '../screens/auth/AdminLoginScreen';
import StudentRegisterScreen from '../screens/auth/StudentRegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import AdminRegisterScreen from '../screens/auth/AdminRegisterScreen';

// Tab navigators
import {
  StudentTabs,
  DepartmentAdminTabs,
  FacultyAdminTabs,
  EnvironmentalAdminTabs,
} from './TabNavigator';

const Stack = createStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
      <Stack.Screen name="StudentLogin" component={StudentLoginScreen} />
      <Stack.Screen name="StudentRegister" component={StudentRegisterScreen} />
      <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
      <Stack.Screen name="AdminRegister" component={AdminRegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

function getTabForRole(role: string) {
  switch (role) {
    case 'student': return StudentTabs;
    case 'departmentAdmin': return DepartmentAdminTabs;
    case 'facultyAdmin': return FacultyAdminTabs;
    case 'environmentalAdmin': return EnvironmentalAdminTabs;
    default: return StudentTabs;
  }
}

function AppContent() {
  const colors = useColors();

  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={{
        dark: colors.background === '#0F172A',
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.danger,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '900' },
        },
      }}
    >
      {isAuthenticated && user ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={getTabForRole(user.role)} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth" component={AuthStack} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

export default function RootNavigator() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
