import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { colors } from '@/lib/theme';

export default function AuthLayout() {
  const { gate } = useAuth();

  if (gate === 'ready') {
    return <Redirect href="/(tabs)" />;
  }

  if (gate === 'needs_onboarding') {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
