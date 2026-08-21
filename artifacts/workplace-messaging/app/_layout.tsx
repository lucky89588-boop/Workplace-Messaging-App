import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { router, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AppProvider, useApp } from '@/context/AppContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { registerDevicePushToken, setBaseUrl } from '@workspace/api-client-react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

setBaseUrl(
  process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : null,
);

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, headerBackTitle: 'Back' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="conversation/[id]" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="person/[id]" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="new-chat" />
      <Stack.Screen name="emergency-contacts" />
      <Stack.Screen name="mentions" />
      <Stack.Screen name="policy" />
      <Stack.Screen name="set-password" />
       <Stack.Screen name="staff-access" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="pending" />
    </Stack>
  );
}

function AuthNavigationGuard() {
  const { phase } = useAuth();
  const segments = useSegments();
  const route = String(segments[0] ?? '');

  useEffect(() => {
    if (phase === 'signed-out' && route !== '') {
      router.replace('/');
      return;
    }
    if (phase === 'set-password' && route !== 'set-password') {
      router.replace('/set-password');
      return;
    }
    if (phase === 'policy' && route !== 'policy') {
      router.replace('/policy');
      return;
    }
    if (
      phase === 'ready' &&
      (route === '' || route === 'set-password' || route === 'policy')
    ) {
      router.replace('/(tabs)');
    }
  }, [phase, route]);

  return <RootLayoutNav />;
}

function DeviceNotificationRegistration() {
  const { phase } = useAuth();
  const { notificationsEnabled } = useApp();

  useEffect(() => {
    if (phase !== 'ready' || Platform.OS === 'web') return;
    let active = true;

    const registerDevice = async () => {
      try {
        if (!notificationsEnabled) {
          const savedToken = await AsyncStorage.getItem('workplace:push-token');
          if (savedToken) await registerDevicePushToken({ expoPushToken: savedToken, enabled: false });
          return;
        }
        const permission = await Notifications.getPermissionsAsync();
        if (permission.status !== 'granted') return;
        const projectId = Constants.easConfig?.projectId
          ?? Constants.expoConfig?.extra?.eas?.projectId;
        const token = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        if (!active) return;
        await registerDevicePushToken({
          expoPushToken: token.data,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          enabled: true,
        });
        await AsyncStorage.setItem('workplace:push-token', token.data);
      } catch (error) {
        // Keep the preference intact: an unavailable network or simulator should
        // retry registration when the app next becomes active.
        console.warn('Unable to register this device for workplace notifications.', error);
      }
    };

    void registerDevice();
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const conversationId = response.notification.request.content.data?.conversationId;
      if (typeof conversationId === 'string') {
        router.push(`/conversation/${conversationId}`);
      }
    });
    return () => {
      active = false;
      responseSubscription.remove();
    };
  }, [notificationsEnabled, phase]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppProvider>
              <DeviceNotificationRegistration />
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <AuthNavigationGuard />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </AppProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
