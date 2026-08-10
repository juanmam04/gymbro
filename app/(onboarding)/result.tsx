import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import {
  clearPendingInviteCode,
  getPendingInviteCode,
} from '@/features/partner/invite-utils';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';
import { updateProfile } from '@/services/auth';
import { acceptPartnerInvite, upsertNutritionGoals } from '@/services/partner';
import { useOnboardingStore } from '@/stores/onboarding';
import { getErrorMessage } from '@/utils/errors';

export default function OnboardingResultScreen() {
  const { user, refreshBootstrap } = useAuth();
  const store = useOnboardingStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targets = store.estimatedTargets;

  const enterApp = async () => {
    if (!user || !store.goalType || !targets || !store.sex || !store.ageYears) {
      setError('Faltan datos. Volvé un paso atrás.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const birthYear = new Date().getFullYear() - store.ageYears;

      await updateProfile(user.id, {
        display_name: store.displayName,
        onboarding_completed: true,
        biological_sex: store.sex,
        birth_year: birthYear,
        height_cm: store.heightCm,
        weight_kg: store.weightKg,
        activity_level: store.activity,
      });

      await upsertNutritionGoals({
        userId: user.id,
        calories: targets.calories,
        protein: targets.protein,
        carbs: targets.carbs,
        fat: targets.fat,
        goalType: store.goalType,
      });

      const pendingCode = await getPendingInviteCode();
      if (pendingCode) {
        try {
          await acceptPartnerInvite(pendingCode);
          await clearPendingInviteCode();
        } catch {
          // Keep pending code if accept fails; user can retry from Home/Profile.
        }
      }

      await refreshBootstrap();
      store.reset();
      router.replace('/(tabs)');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar tu perfil'));
    } finally {
      setLoading(false);
    }
  };

  if (!targets) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <Text style={styles.title}>Todavía falta un paso</Text>
          <Button title="Volver" onPress={() => router.replace('/(onboarding)/activity')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.step}>5 de 5</Text>
        <Text style={styles.title}>Listo, ya tenés tu punto de partida.</Text>
        <Text style={styles.subtitle}>
          GymBro va a ayudarte a registrar lo que comés y entender cómo venís durante el día.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Tu objetivo diario estimado</Text>
          <Text style={styles.calories}>≈ {targets.calories.toLocaleString('es-AR')} kcal</Text>
          <View style={styles.macros}>
            <Macro label="Proteína" value={`${targets.protein} g`} />
            <Macro label="Carbohidratos" value={`${targets.carbs} g`} />
            <Macro label="Grasas" value={`${targets.fat} g`} />
          </View>
        </View>

        <Text style={styles.note}>Podés cambiar estos objetivos cuando quieras.</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.spacer} />
        <Button title="Entrar a GymBro" onPress={enterApp} loading={loading} />
      </View>
    </SafeAreaView>
  );
}

function Macro({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.macro}>
      <Text style={styles.macroValue}>{value}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.xl, gap: spacing.lg },
  step: { ...typography.label, color: colors.accent },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
    marginTop: spacing.md,
  },
  cardLabel: { ...typography.label, color: colors.textSecondary },
  calories: { ...typography.brand, color: colors.primary, fontSize: 40 },
  macros: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  macro: { flex: 1, gap: 2 },
  macroValue: { ...typography.bodyMedium, color: colors.text },
  macroLabel: { ...typography.caption, color: colors.textTertiary },
  note: { ...typography.caption, color: colors.textSecondary },
  error: { ...typography.caption, color: colors.danger },
  spacer: { flex: 1 },
});
