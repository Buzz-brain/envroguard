import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from '../utils/navigation';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { ThemeProvider, useColors } from '../contexts/ThemeContext';
import SplashScreen from '../screens/launch/SplashScreen';
import SessionScreen from '../screens/launch/SessionScreen';
import OnboardingScreen from '../screens/launch/OnboardingScreen';
import WelcomeRoleScreen from '../screens/launch/WelcomeRoleScreen';
import { getItem, deleteItem } from '../utils/storage';

// Auth screens
import LandingScreen from '../screens/auth/LandingScreen';
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

type Phase = 'splash' | 'session' | 'app';

const Stack = createStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="StudentLogin" component={StudentLoginScreen} />
      <Stack.Screen name="StudentRegister" component={StudentRegisterScreen} />
      <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
      <Stack.Screen name="AdminRegister" component={AdminRegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

function AutoAuthScreen({ navigation }: any) {
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    getItem('lastRole').then((role) => {
      const target = role === 'student' ? 'StudentLogin' : 'AdminLogin';
      navigation.replace('Auth', { screen: target, params: { autoRole: role } });
    });
  }, [navigation]);

  return null;
}

function PreAuthStack() {
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const [lastRole, setLastRole] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const val = await getItem('hasCompletedOnboarding');
        setOnboardingDone(val === 'true');
        const role = await getItem('lastRole');
        setLastRole(role);
      } catch {
        setOnboardingDone(false);
      }
    };
    check();
  }, []);

  if (onboardingDone === null) return null;

  const showOnboarding = !onboardingDone && !lastRole;

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={showOnboarding ? 'Onboarding' : lastRole ? 'AutoAuth' : 'WelcomeRole'}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="AutoAuth" component={AutoAuthScreen} />
      <Stack.Screen name="WelcomeRole" component={WelcomeRoleScreen} />
      <Stack.Screen name="Auth" component={AuthStack} />
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
  const [phase, setPhase] = useState<Phase>('splash');

  // SplashScreen handles its own timing via onComplete callback

  useEffect(() => {
    if (phase === 'session' && !isLoading) {
      setPhase('app');
    }
  }, [phase, isLoading]);

  if (phase === 'splash') {
    return <SplashScreen onComplete={() => setPhase('session')} />;
  }

  if (phase === 'session') {
    return <SessionScreen />;
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
        <PreAuthStack />
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