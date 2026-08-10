import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { ACTIVITY_OPTIONS } from '@/constants';
import { calculateNutritionTargets } from '@/features/nutrition/services/calculateNutritionTargets';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { useOnboardingStore } from '@/stores/onboarding';
import type { ActivityLevel } from '@/types/database';

export default function OnboardingActivityScreen() {
  const store = useOnboardingStore();

  const continueNext = () => {
    if (
      !store.goalType ||
      !store.sex ||
      !store.ageYears ||
      !store.heightCm ||
      !store.weightKg ||
      !store.activity
    ) {
      return;
    }

    const targets = calculateNutritionTargets({
      sex: store.sex,
      ageYears: store.ageYears,
      heightCm: store.heightCm,
      weightKg: store.weightKg,
      activity: store.activity,
      goalType: store.goalType,
    });
    store.setEstimatedTargets(targets);
    router.push('/(onboarding)/result');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.step}>4 de 5</Text>
        <Text style={styles.title}>¿Cuánto te movés normalmente?</Text>
        <Text style={styles.subtitle}>Elegí lo que más se acerque a tu semana típica.</Text>

        <View style={styles.options}>
          {ACTIVITY_OPTIONS.map((option) => {
            const selected = store.activity === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => store.setActivity(option.value as ActivityLevel)}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>
                  {option.label}
                </Text>
                <Text style={styles.optionDesc}>{option.description}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.spacer} />
        <Button title="Continuar" onPress={continueNext} disabled={!store.activity} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.xl, gap: spacing.lg },
  step: { ...typography.label, color: colors.accent },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary },
  options: { gap: spacing.md, marginTop: spacing.sm },
  option: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 4,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  optionTitle: { ...typography.h3, color: colors.text },
  optionTitleSelected: { color: colors.primary },
  optionDesc: { ...typography.caption, color: colors.textSecondary },
  spacer: { flex: 1 },
});
