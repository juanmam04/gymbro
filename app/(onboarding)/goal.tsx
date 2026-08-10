import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { GOAL_OPTIONS } from '@/constants';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { useOnboardingStore } from '@/stores/onboarding';
import type { GoalType } from '@/types/database';

export default function OnboardingGoalScreen() {
  const goalType = useOnboardingStore((s) => s.goalType);
  const setGoalType = useOnboardingStore((s) => s.setGoalType);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.step}>2 de 5</Text>
        <Text style={styles.title}>¿Cuál es tu objetivo?</Text>
        <Text style={styles.subtitle}>Elegí el que más te represente hoy. Podés cambiarlo después.</Text>

        <View style={styles.options}>
          {GOAL_OPTIONS.map((option) => {
            const selected = goalType === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setGoalType(option.value as GoalType)}
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
        <Button
          title="Continuar"
          onPress={() => router.push('/(onboarding)/body')}
          disabled={!goalType}
        />
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
