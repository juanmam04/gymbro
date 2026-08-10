import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SEX_OPTIONS } from '@/constants';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { useOnboardingStore } from '@/stores/onboarding';
import { bodyMetricsSchema, type BodyMetricsInput } from '@/utils/validation';

export default function OnboardingBodyScreen() {
  const store = useOnboardingStore();

  const { control, handleSubmit, setValue, watch } = useForm<BodyMetricsInput>({
    resolver: zodResolver(bodyMetricsSchema),
    defaultValues: {
      sex: store.sex ?? undefined,
      ageYears: store.ageYears ?? undefined,
      heightCm: store.heightCm ?? undefined,
      weightKg: store.weightKg ?? undefined,
    },
  });

  const sex = watch('sex');

  const onSubmit = handleSubmit((values) => {
    store.setBody(values);
    router.push('/(onboarding)/activity');
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.step}>3 de 5</Text>
        <Text style={styles.title}>Un poco sobre vos</Text>
        <Text style={styles.subtitle}>
          Usamos esto para estimar tus necesidades diarias. No es un consejo médico.
        </Text>

        <Text style={styles.label}>Sexo biológico</Text>
        <View style={styles.sexRow}>
          {SEX_OPTIONS.map((option) => {
            const selected = sex === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setValue('sex', option.value, { shouldValidate: true })}
                style={[styles.sexChip, selected && styles.sexChipSelected]}
              >
                <Text style={[styles.sexText, selected && styles.sexTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Controller
          control={control}
          name="ageYears"
          render={({ field: { onChange, value }, fieldState }) => (
            <Input
              label="Edad"
              keyboardType="number-pad"
              value={value != null ? String(value) : ''}
              onChangeText={(text) => onChange(Number(text.replace(/[^0-9]/g, '')) || 0)}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="heightCm"
          render={({ field: { onChange, value }, fieldState }) => (
            <Input
              label="Altura (cm)"
              keyboardType="number-pad"
              value={value != null ? String(value) : ''}
              onChangeText={(text) => onChange(Number(text.replace(/[^0-9]/g, '')) || 0)}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="weightKg"
          render={({ field: { onChange, value }, fieldState }) => (
            <Input
              label="Peso (kg)"
              keyboardType="decimal-pad"
              value={value != null ? String(value) : ''}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9.]/g, '');
                onChange(Number(cleaned) || 0);
              }}
              error={fieldState.error?.message}
            />
          )}
        />

        <Button title="Continuar" onPress={onSubmit} style={styles.cta} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  step: { ...typography.label, color: colors.accent },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary },
  label: { ...typography.label, color: colors.textSecondary },
  sexRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sexChip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  sexChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  sexText: { ...typography.label, color: colors.textSecondary },
  sexTextSelected: { color: colors.primary },
  cta: { marginTop: spacing.md },
});
