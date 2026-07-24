import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import Toast, { BaseToastProps } from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider } from './src/contexts/AuthContext';
import { NetworkProvider } from './src/contexts/NetworkContext';
import NetworkBanner from './src/components/ui/NetworkBanner';
import RootNavigator from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/ui/ErrorBoundary';
import { usePushNotifications } from './src/hooks/usePushNotifications';

const toastConfig = {
  success: (props: BaseToastProps) => (
    <View style={[styles.toastBase, { backgroundColor: '#059669' }]}>
      <Ionicons name="checkmark-circle" size={22} color="#FFF" style={{ marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.toastTitle} numberOfLines={1}>{props.text1}</Text>
        {props.text2 && <Text style={styles.toastMessage} numberOfLines={2}>{props.text2}</Text>}
      </View>
    </View>
  ),
  error: (props: BaseToastProps) => (
    <View style={[styles.toastBase, { backgroundColor: '#DC2626' }]}>
      <Ionicons name="alert-circle" size={22} color="#FFF" style={{ marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.toastTitle} numberOfLines={1}>{props.text1}</Text>
        {props.text2 && <Text style={styles.toastMessage} numberOfLines={2}>{props.text2}</Text>}
      </View>
    </View>
  ),
  warning: (props: BaseToastProps) => (
    <View style={[styles.toastBase, { backgroundColor: '#D97706' }]}>
      <Ionicons name="warning" size={22} color="#FFF" style={{ marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.toastTitle} numberOfLines={1}>{props.text1}</Text>
        {props.text2 && <Text style={styles.toastMessage} numberOfLines={2}>{props.text2}</Text>}
      </View>
    </View>
  ),
  info: (props: BaseToastProps) => (
    <View style={[styles.toastBase, { backgroundColor: '#2563EB' }]}>
      <Ionicons name="information-circle" size={22} color="#FFF" style={{ marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.toastTitle} numberOfLines={1}>{props.text1}</Text>
        {props.text2 && <Text style={styles.toastMessage} numberOfLines={2}>{props.text2}</Text>}
      </View>
    </View>
  ),
};

function AppContent() {
  usePushNotifications();
  return (
    <>
      <RootNavigator />
      <NetworkBanner />
      <Toast config={toastConfig} />
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'PlusJakartaSans_400Regular': require('@expo-google-fonts/plus-jakarta-sans/400Regular/PlusJakartaSans_400Regular.ttf'),
    'PlusJakartaSans_500Medium': require('@expo-google-fonts/plus-jakarta-sans/500Medium/PlusJakartaSans_500Medium.ttf'),
    'PlusJakartaSans_600SemiBold': require('@expo-google-fonts/plus-jakarta-sans/600SemiBold/PlusJakartaSans_600SemiBold.ttf'),
    'PlusJakartaSans_700Bold': require('@expo-google-fonts/plus-jakarta-sans/700Bold/PlusJakartaSans_700Bold.ttf'),
  });
  const [minTimePassed, setMinTimePassed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimePassed(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!fontsLoaded || !minTimePassed) {
    return (
      <View style={styles.splash}>
        <Image
          source={require('./proposed-assets/EnviroGuardIcon.png')}
          style={styles.splashLogo}
          resizeMode="contain"
        />
        <View style={{ flexDirection: 'row', marginTop: 24, marginBottom: 32 }}>
          <Text style={styles.splashTitleGreen}>Enviro</Text>
          <Text style={styles.splashTitleBlack}>Guard</Text>
        </View>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <AuthProvider>
            <NetworkProvider>
              <AppContent />
            </NetworkProvider>
            <StatusBar style="dark" />
          </AuthProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  splashLogo: {
    width: 100,
    height: 100,
  },
  splashTitleGreen: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 34,
    color: '#059669',
    lineHeight: 40,
    includeFontPadding: false,
    textAlign: 'center',
  },
  splashTitleBlack: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 34,
    color: '#1F2937',
    lineHeight: 40,
    includeFontPadding: false,
    textAlign: 'center',
  },
  toastBase: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    minHeight: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  toastTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  toastMessage: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
});
