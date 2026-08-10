import { type ErrorBoundaryProps } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { logger } from '@/lib/logger';

export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  logger.error('Unhandled UI error', { name: error.name, message: error.message });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Algo salió mal.</Text>
      <Text style={styles.body}>
        Podés intentar nuevamente. Si el problema continúa, cerrá y volvé a abrir la app.
      </Text>
      <Pressable style={styles.button} onPress={retry} accessibilityRole="button">
        <Text style={styles.buttonText}>Intentar nuevamente</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  title: { ...typography.h2, color: colors.text },
  body: { ...typography.body, color: colors.textSecondary },
  button: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  buttonText: { ...typography.bodyMedium, color: colors.white },
});
