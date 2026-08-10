import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, spacing, typography } from '@/lib/theme';
import { useOnboardingStore } from '@/stores/onboarding';
import { displayNameSchema, type DisplayNameInput } from '@/utils/validation';

export default function OnboardingNameScreen() {
  const setDisplayName = useOnboardingStore((s) => s.setDisplayName);
  const current = useOnboardingStore((s) => s.displayName);

  const { control, handleSubmit } = useForm<DisplayNameInput>({
    resolver: zodResolver(displayNameSchema),
    defaultValues: { displayName: current },
  });

  const onSubmit = handleSubmit((values) => {
    setDisplayName(values.displayName.trim());
    router.push('/(onboarding)/goal');
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.step}>1 de 5</Text>
        <Text style={styles.title}>¿Cómo te llamás?</Text>
        <Text style={styles.subtitle}>Así te van a ver cuando compartas una comida.</Text>

        <Controller
          control={control}
          name="displayName"
          render={({ field: { onChange, onBlur, value }, fieldState }) => (
            <Input
              label="Tu nombre"
              autoFocus
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        <View style={styles.spacer} />
        <Button title="Continuar" onPress={onSubmit} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.xl, gap: spacing.lg },
  step: { ...typography.label, color: colors.accent },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  spacer: { flex: 1 },
});
