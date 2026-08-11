import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { StyleSheet } from 'react-native';
import { queryClient } from '@/lib/query-client';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { AuthProvider } from '@/providers/AuthProvider';
import { colors } from '@/lib/theme';

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <AppErrorBoundary {...props} />;
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Outfit_600SemiBold,
    Outfit_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="meal/result" />
            <Stack.Screen name="meal/manual" />
            <Stack.Screen name="meal/search" />
            <Stack.Screen name="meal/barcode" />
            <Stack.Screen name="meal/repeat" />
            <Stack.Screen name="meal/[id]" />
            <Stack.Screen name="meal/edit/[id]" />
            <Stack.Screen name="partner/invite" options={{ presentation: 'modal' }} />
            <Stack.Screen name="partner/join" options={{ presentation: 'modal' }} />
            <Stack.Screen name="partner/[id]" />
            <Stack.Screen name="join/[code]" />
            <Stack.Screen name="history/index" />
            <Stack.Screen name="settings/privacy" />
            <Stack.Screen name="settings/notifications" />
            <Stack.Screen name="settings/account" />
            <Stack.Screen name="shared/[inviteId]" options={{ presentation: 'modal' }} />
          </Stack>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
