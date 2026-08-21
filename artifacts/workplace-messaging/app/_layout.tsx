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
import { AppProvider } from '@/context/AppContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { setBaseUrl } from '@workspace/api-client-react';

setBaseUrl(
  process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : null,
);

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

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
