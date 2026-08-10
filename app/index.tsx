import { Redirect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing, typography } from '@/lib/theme';

export default function Index() {
  const { gate } = useAuth();

  if (gate === 'loading') {
    return <LoadingState message="Preparando GymBro…" />;
  }

  if (gate === 'misconfigured') {
    return (
      <View style={styles.container}>
        <Text style={styles.brand}>GymBro</Text>
        <Text style={styles.title}>Falta configurar Supabase</Text>
        <Text style={styles.body}>
          Copia `.env.example` a `.env` y completa `EXPO_PUBLIC_SUPABASE_URL` y
          `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Luego reinicia Expo.
        </Text>
      </View>
    );
  }

  if (gate === 'unauthenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  if (gate === 'needs_onboarding') {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  brand: {
    ...typography.brand,
    color: colors.primary,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
