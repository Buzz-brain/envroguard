import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from '../utils/navigation';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { ThemeProvider, useColors } from '../contexts/ThemeContext';
import SplashScreen from '../screens/launch/SplashScreen';
import SessionScreen from '../screens/launch/SessionScreen';
import OnboardingScreen from '../screens/launch/OnboardingScreen';
import WelcomeRoleScreen from '../screens/launch/WelcomeRoleScreen';
import { getItem } from '../utils/storage';

import StudentLoginScreen from '../screens/auth/StudentLoginScreen';
import AdminLoginScreen from '../screens/auth/AdminLoginScreen';
import StudentRegisterScreen from '../screens/auth/StudentRegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import AdminRegisterScreen from '../screens/auth/AdminRegisterScreen';

import {
  StudentTabs,
  DepartmentAdminTabs,
  FacultyAdminTabs,
  EnvironmentalAdminTabs,
} from './TabNavigator';

type Phase = 'splash' | 'session' | 'app';

let hasCompletedSplash = false;

const RootStack = createStackNavigator();
const AuthStack = createStackNavigator();

function AuthScreens() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <AuthStack.Screen name="StudentLogin" component={StudentLoginScreen} />
      <AuthStack.Screen name="StudentRegister" component={StudentRegisterScreen} />
      <AuthStack.Screen name="AdminLogin" component={AdminLoginScreen} />
      <AuthStack.Screen name="AdminRegister" component={AdminRegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
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
  const [phase, setPhase] = useState<Phase>(hasCompletedSplash ? 'app' : 'splash');
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    getItem('hasCompletedOnboarding').then((val) => {
      setHasOnboarded(val === 'true');
    });
  }, []);

  useEffect(() => {
    if (phase === 'session' && !isLoading && hasOnboarded !== null) {
      hasCompletedSplash = true;
      setPhase('app');
    }
  }, [phase, isLoading, hasOnboarded]);

  if (phase === 'splash') {
    return <SplashScreen onComplete={() => setPhase('session')} />;
  }

  if (phase === 'session') {
    return <SessionScreen />;
  }

  if (hasOnboarded === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const theme = {
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
      regular: { fontFamily: 'System', fontWeight: '400' as const },
      medium: { fontFamily: 'System', fontWeight: '500' as const },
      bold: { fontFamily: 'System', fontWeight: '700' as const },
      heavy: { fontFamily: 'System', fontWeight: '900' as const },
    },
  };

  return (
    <NavigationContainer ref={navigationRef} theme={theme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }} key={isAuthenticated && user ? 'auth' : 'guest'}>
        {isAuthenticated && user ? (
          <RootStack.Screen name="Main" component={getTabForRole(user.role)} />
        ) : !hasOnboarded ? (
          <>
            <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
            <RootStack.Screen name="WelcomeRole" component={WelcomeRoleScreen} />
            <RootStack.Screen name="AuthFlow" component={AuthScreens} />
          </>
        ) : (
          <>
            <RootStack.Screen name="WelcomeRole" component={WelcomeRoleScreen} />
            <RootStack.Screen name="AuthFlow" component={AuthScreens} />
            <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
          </>
        )}
      </RootStack.Navigator>
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
