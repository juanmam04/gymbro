import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { colors } from '@/lib/theme';

export default function OnboardingLayout() {
  const { gate } = useAuth();

  if (gate === 'unauthenticated' || gate === 'misconfigured') {
    return <Redirect href="/" />;
  }

  if (gate === 'ready') {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="name" />
      <Stack.Screen name="goal" />
      <Stack.Screen name="body" />
      <Stack.Screen name="activity" />
      <Stack.Screen name="result" />
    </Stack>
  );
}
