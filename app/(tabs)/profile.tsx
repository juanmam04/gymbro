import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GOAL_OPTIONS, QUERY_KEYS } from '@/constants';
import { calculateNutritionTargets } from '@/features/nutrition/services/calculateNutritionTargets';
import { generateNutritionInsights } from '@/features/insights/generateNutritionInsights';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';
import { updateProfile } from '@/services/auth';
import { CHALLENGE_TEMPLATES, createChallenge, fetchActiveChallenges } from '@/services/challenges';
import { fetchMealsSince, uploadAvatar } from '@/services/meals';
import { upsertNutritionGoals } from '@/services/partner';
import { addWeightEntry, fetchLatestWeight, fetchWeightHistory } from '@/services/weight';
import { fetchWaterSince, waterByDayMap } from '@/services/water';
import { getErrorMessage } from '@/utils/errors';
import { nutritionGoalsSchema, type NutritionGoalsInput } from '@/utils/validation';

export default function ProfileScreen() {
  const { user, profile, partner, goals, signOut, refreshBootstrap } = useAuth();
  const queryClient = useQueryClient();
  const [editingGoals, setEditingGoals] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  const displayMode = profile?.nutrition_display_mode ?? 'simple';

  const { control, handleSubmit } = useForm<NutritionGoalsInput>({
    resolver: zodResolver(nutritionGoalsSchema),
    values: {
      calories: goals?.calories_target ?? 2200,
      protein: goals?.protein_target ?? 140,
      carbs: goals?.carbs_target ?? 220,
      fat: goals?.fat_target ?? 70,
    },
  });

  const since = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString();
  })();

  const mealsQuery = useQuery({
    queryKey: QUERY_KEYS.mealsSince(user?.id),
    queryFn: () => fetchMealsSince(user!.id, since),
    enabled: Boolean(user?.id),
  });

  const waterQuery = useQuery({
    queryKey: ['waterHistory', user?.id],
    queryFn: () => fetchWaterSince(user!.id, since),
    enabled: Boolean(user?.id),
  });

  const weightQuery = useQuery({
    queryKey: QUERY_KEYS.weightLatest(user?.id),
    queryFn: () => fetchLatestWeight(user!.id),
    enabled: Boolean(user?.id),
  });

  const weightHistoryQuery = useQuery({
    queryKey: QUERY_KEYS.weightHistory(user?.id),
    queryFn: () => fetchWeightHistory(user!.id, since),
    enabled: Boolean(user?.id),
  });

  const challengesQuery = useQuery({
    queryKey: QUERY_KEYS.challenges(user?.id),
    queryFn: () => fetchActiveChallenges(user!.id),
    enabled: Boolean(user?.id),
  });

  const insights = generateNutritionInsights({
    meals: (mealsQuery.data ?? []).map((m) => ({
      eatenAt: m.eaten_at,
      protein: Number(m.total_protein),
      calories: Number(m.total_calories),
    })),
    proteinTarget: goals?.protein_target ?? 140,
    waterByDay: waterByDayMap(waterQuery.data ?? []),
    waterGoalMl: profile?.water_goal_ml ?? 2500,
  });

  const saveGoals = useMutation({
    mutationFn: async (values: NutritionGoalsInput) => {
      if (!user || !goals) throw new Error('Sesión inválida');
      return upsertNutritionGoals({
        userId: user.id,
        ...values,
        goalType: goals.goal_type,
      });
    },
    onSuccess: async () => {
      await refreshBootstrap();
      setEditingGoals(false);
    },
    onError: (e) => Alert.alert('Error', getErrorMessage(e)),
  });

  const toggleMode = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const next = displayMode === 'simple' ? 'detailed' : 'simple';
      return updateProfile(user.id, { nutrition_display_mode: next });
    },
    onSuccess: () => refreshBootstrap(),
  });

  const avatarMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Sin sesión');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Acceso a fotos',
          'RACHA necesita acceso a tus fotos para cambiar tu foto de perfil. Podés habilitarlo en Ajustes.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Abrir Ajustes', onPress: () => void Linking.openSettings() },
          ],
        );
        return null;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]?.uri) return null;
      const url = await uploadAvatar(user.id, result.assets[0].uri);
      await updateProfile(user.id, { avatar_url: url });
      return url;
    },
    onSuccess: () => refreshBootstrap(),
    onError: (e) => Alert.alert('Error', getErrorMessage(e)),
  });

  const weightMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Sin sesión');
      const value = Number(weightInput.replace(',', '.'));
      if (!value || value < 30 || value > 300) throw new Error('Ingresá un peso válido');
      return addWeightEntry(user.id, value);
    },
    onSuccess: async () => {
      setWeightInput('');
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.weightLatest(user?.id) });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.weightHistory(user?.id) });
      await refreshBootstrap();
    },
    onError: (e) => Alert.alert('Error', getErrorMessage(e)),
  });

  const recalculate = useMutation({
    mutationFn: async () => {
      if (!user || !profile || !goals) throw new Error('Faltan datos');
      if (
        !profile.biological_sex ||
        !profile.birth_year ||
        !profile.height_cm ||
        !profile.weight_kg ||
        !profile.activity_level
      ) {
        throw new Error('Faltan tus datos físicos para recalcular.');
      }
      const ageYears = new Date().getFullYear() - profile.birth_year;
      const targets = calculateNutritionTargets({
        sex: profile.biological_sex,
        ageYears,
        heightCm: Number(profile.height_cm),
        weightKg: Number(profile.weight_kg),
        activity: profile.activity_level,
        goalType: goals.goal_type,
      });
      await upsertNutritionGoals({
        userId: user.id,
        ...targets,
        goalType: goals.goal_type,
      });
    },
    onSuccess: () => {
      refreshBootstrap();
      Alert.alert('Listo', 'Recalculamos tu punto de partida.');
    },
    onError: (e) => Alert.alert('Error', getErrorMessage(e)),
  });

  const startChallenge = useMutation({
    mutationFn: async (template: (typeof CHALLENGE_TEMPLATES)[number]) => {
      if (!user) throw new Error('Sin sesión');
      return createChallenge({
        userId: user.id,
        partnerId: partner?.id,
        scope: partner ? 'joint' : 'personal',
        metric: template.metric,
        title: template.title,
        targetDays: template.targetDays,
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.challenges(user?.id) }),
    onError: (e) => Alert.alert('Error', getErrorMessage(e)),
  });

  const goalLabel =
    GOAL_OPTIONS.find((g) => g.value === goals?.goal_type)?.label ?? 'Sin objetivo';

  const weightDelta7 = (() => {
    const history = weightHistoryQuery.data ?? [];
    if (history.length < 2) return null;
    const latest = history[history.length - 1]!;
    const weekAgo = [...history].reverse().find((w) => {
      const days =
        (new Date(latest.measured_at).getTime() - new Date(w.measured_at).getTime()) /
        (1000 * 60 * 60 * 24);
      return days >= 6;
    });
    if (!weekAgo) return null;
    return Number(latest.weight_kg) - Number(weekAgo.weight_kg);
  })();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Perfil</Text>

        <View style={styles.hero}>
          <Pressable onPress={() => avatarMutation.mutate()} accessibilityLabel="Cambiar foto">
            <Avatar name={profile?.display_name ?? 'U'} uri={profile?.avatar_url} size={80} />
          </Pressable>
          <Text style={styles.name}>{profile?.display_name}</Text>
          <Text style={styles.meta}>{goalLabel}</Text>
          <Text style={styles.hint}>Tocá la foto para cambiarla</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Modo de visualización</Text>
              <Text style={styles.cardBody}>
                {displayMode === 'simple' ? 'Simple — mensajes claros' : 'Detallado — números completos'}
              </Text>
            </View>
            <Switch
              value={displayMode === 'detailed'}
              onValueChange={() => toggleMode.mutate()}
              trackColor={{ true: colors.accent, false: colors.border }}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tu compañero</Text>
          {partner ? (
            <Button
              title={`Ver perfil de ${partner.display_name}`}
              variant="secondary"
              onPress={() => router.push(`/partner/${partner.id}`)}
            />
          ) : (
            <>
              <Text style={styles.cardBody}>Todavía no estás conectado.</Text>
              <Button title="Invitar a alguien" onPress={() => router.push('/partner/invite')} />
              <Button title="Tengo un código" variant="secondary" onPress={() => router.push('/partner/join')} />
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Objetivos nutricionales</Text>
          {editingGoals ? (
            <View style={styles.form}>
              {(['calories', 'protein', 'carbs', 'fat'] as const).map((field) => (
                <Controller
                  key={field}
                  control={control}
                  name={field}
                  render={({ field: { onChange, value }, fieldState }) => (
                    <Input
                      label={
                        field === 'calories'
                          ? 'Calorías'
                          : field === 'protein'
                            ? 'Proteína (g)'
                            : field === 'carbs'
                              ? 'Carbohidratos (g)'
                              : 'Grasas (g)'
                      }
                      keyboardType="number-pad"
                      value={String(value)}
                      onChangeText={(t) => onChange(Number(t.replace(/[^0-9]/g, '')) || 0)}
                      error={fieldState.error?.message}
                    />
                  )}
                />
              ))}
              <Button title="Guardar" loading={saveGoals.isPending} onPress={handleSubmit((v) => saveGoals.mutate(v))} />
              <Button title="Cancelar" variant="ghost" onPress={() => setEditingGoals(false)} />
            </View>
          ) : (
            <>
              <Text style={styles.cardBody}>
                {goals
                  ? `≈ ${goals.calories_target} kcal · P ${goals.protein_target}g · C ${goals.carbs_target}g · G ${goals.fat_target}g`
                  : 'Sin objetivos'}
              </Text>
              <Button title="Editar objetivos" variant="secondary" onPress={() => setEditingGoals(true)} />
              <Button title="Recalcular objetivos" variant="ghost" loading={recalculate.isPending} onPress={() => recalculate.mutate()} />
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Peso</Text>
          <Text style={styles.cardBody}>
            Último: {weightQuery.data ? `${weightQuery.data.weight_kg} kg` : profile?.weight_kg ? `${profile.weight_kg} kg` : 'Sin registrar'}
            {weightDelta7 != null
              ? ` · 7 días: ${weightDelta7 > 0 ? '+' : ''}${weightDelta7.toFixed(1)} kg`
              : ''}
          </Text>
          <Input
            label="Nuevo peso (kg)"
            keyboardType="decimal-pad"
            value={weightInput}
            onChangeText={setWeightInput}
          />
          <Button title="Registrar peso" loading={weightMutation.isPending} onPress={() => weightMutation.mutate()} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Insights</Text>
          {insights.length === 0 ? (
            <Text style={styles.cardBody}>Cuando registres más días, vas a ver tendencias acá.</Text>
          ) : (
            insights.map((insight) => (
              <View key={insight.id} style={styles.insight}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.cardBody}>{insight.detail}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Desafío de la semana</Text>
          {(challengesQuery.data ?? []).length > 0 ? (
            challengesQuery.data!.map((c) => (
              <Text key={c.id} style={styles.cardBody}>
                {c.title} · meta {c.target_days} días
              </Text>
            ))
          ) : (
            CHALLENGE_TEMPLATES.map((t) => (
              <Button
                key={t.metric}
                title={t.title}
                variant="secondary"
                onPress={() => startChallenge.mutate(t)}
              />
            ))
          )}
        </View>

        <Button title="Historial" variant="secondary" onPress={() => router.push('/history')} />
        <Button title="Privacidad" variant="secondary" onPress={() => router.push('/settings/privacy')} />
        <Button title="Notificaciones" variant="secondary" onPress={() => router.push('/settings/notifications')} />
        <Button title="Cuenta" variant="secondary" onPress={() => router.push('/settings/account')} />

        <Button
          title="Cerrar sesión"
          variant="danger"
          loading={signingOut}
          onPress={async () => {
            setSigningOut(true);
            try {
              await signOut();
              router.replace('/(auth)/login');
            } finally {
              setSigningOut(false);
            }
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xxxl },
  title: { ...typography.h1, color: colors.text },
  hero: { alignItems: 'center', gap: spacing.sm },
  name: { ...typography.h2, color: colors.text },
  meta: { ...typography.body, color: colors.textSecondary },
  hint: { ...typography.caption, color: colors.textTertiary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTitle: { ...typography.h3, color: colors.text },
  cardBody: { ...typography.body, color: colors.textSecondary },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  form: { gap: spacing.md },
  insight: { gap: 2 },
  insightTitle: { ...typography.bodyMedium, color: colors.text },
});
