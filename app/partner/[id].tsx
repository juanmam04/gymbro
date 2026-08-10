import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { MEAL_TYPE_LABELS, QUERY_KEYS } from '@/constants';
import { canShowGoals, getPrivacyFlags } from '@/features/privacy/privacy';
import { calculatePersonalStreak } from '@/features/streaks/calculateStreaks';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';
import { getProfile } from '@/services/auth';
import {
  fetchMealsForDay,
  fetchMealsSince,
  fetchTodayTotals,
} from '@/services/meals';
import { getNutritionGoals } from '@/services/partner';
import { getHumanErrorMessage } from '@/utils/errors';

export default function PartnerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const profileQuery = useQuery({
    queryKey: QUERY_KEYS.profile(id),
    queryFn: () => getProfile(id!),
    enabled: Boolean(id),
  });

  const goalsQuery = useQuery({
    queryKey: QUERY_KEYS.goals(id),
    queryFn: () => getNutritionGoals(id!),
    enabled: Boolean(id),
  });

  const streakQuery = useQuery({
    queryKey: ['partnerStreak', id],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const meals = await fetchMealsSince(id!, since.toISOString());
      return calculatePersonalStreak(meals.map((m) => ({ eatenAt: m.eaten_at })));
    },
    enabled: Boolean(id),
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const todayMealsQuery = useQuery({
    queryKey: ['partnerTodayMeals', id],
    queryFn: () => fetchMealsForDay(id!, todayStart.toISOString(), todayEnd.toISOString()),
    enabled: Boolean(id),
  });

  const todayTotalsQuery = useQuery({
    queryKey: QUERY_KEYS.todayTotals(id),
    queryFn: () => fetchTodayTotals(id!),
    enabled: Boolean(id),
  });

  const profile = profileQuery.data;
  const privacy = getPrivacyFlags(profile);
  const showGoals = profile && user ? canShowGoals(profile.id, user.id, privacy) : false;
  const showMeals = privacy.share_meals;

  if (profileQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState
          message={getHumanErrorMessage(profileQuery.error, 'No encontramos ese perfil.')}
          onRetry={() => profileQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  const goals = goalsQuery.data;
  const todayTotals = todayTotalsQuery.data;
  const todayMeals = todayMealsQuery.data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Perfil</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.profileCard}>
          <Avatar name={profile.display_name} uri={profile.avatar_url} size={72} />
          <Text style={styles.name}>{profile.display_name}</Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{streakQuery.data ?? '—'}</Text>
              <Text style={styles.statLabel}>Racha personal</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{todayMeals.length}</Text>
              <Text style={styles.statLabel}>Comidas hoy</Text>
            </View>
          </View>
        </View>

        {showGoals && goals && todayTotals ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hoy</Text>
            <View style={styles.goalsCard}>
              <Text style={styles.goalsLine}>
                {Math.round(todayTotals.calories)} / {Math.round(goals.calories_target)} kcal
              </Text>
              <Text style={styles.goalsMeta}>
                Proteína {Math.round(todayTotals.protein)} / {Math.round(goals.protein_target)} g
              </Text>
            </View>
          </View>
        ) : !showGoals ? (
          <Text style={styles.privateNote}>Los objetivos de hoy están ocultos.</Text>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Comidas de hoy
            {!showMeals ? ' (ocultas)' : ''}
          </Text>

          {todayMealsQuery.isLoading ? <LoadingState message="Cargando comidas…" /> : null}

          {!showMeals ? (
            <Text style={styles.privateNote}>Este usuario prefiere no compartir sus comidas.</Text>
          ) : todayMeals.length === 0 ? (
            <EmptyState
              icon="restaurant-outline"
              title="Sin comidas hoy"
              description="Todavía no registró nada hoy."
            />
          ) : (
            <View style={styles.mealsList}>
              {todayMeals.map((meal) => (
                <Pressable
                  key={meal.id}
                  style={styles.mealRow}
                  onPress={() => router.push(`/meal/${meal.id}`)}
                >
                  {meal.image_url ? (
                    <Image source={{ uri: meal.image_url }} style={styles.thumb} contentFit="cover" />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder]}>
                      <Ionicons name="restaurant-outline" size={20} color={colors.textTertiary} />
                    </View>
                  )}
                  <View style={styles.mealInfo}>
                    <Text style={styles.mealTitle}>{MEAL_TYPE_LABELS[meal.meal_type]}</Text>
                    <Text style={styles.mealMeta}>
                      {format(new Date(meal.eaten_at), 'HH:mm', { locale: es })}
                      {privacy.share_calories
                        ? ` · ${Math.round(meal.total_calories)} kcal`
                        : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { ...typography.h2, color: colors.text },
  profileCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  name: { ...typography.h2, color: colors.text },
  statsRow: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.sm },
  stat: { alignItems: 'center', gap: 4 },
  statValue: { ...typography.h2, color: colors.primary },
  statLabel: { ...typography.caption, color: colors.textSecondary },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.h3, color: colors.text },
  goalsCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  goalsLine: { ...typography.bodyMedium, color: colors.primary },
  goalsMeta: { ...typography.caption, color: colors.textSecondary },
  privateNote: { ...typography.body, color: colors.textTertiary, fontStyle: 'italic' },
  mealsList: { gap: spacing.sm },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  thumb: { width: 48, height: 48, borderRadius: radius.sm },
  thumbPlaceholder: {
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealInfo: { flex: 1, gap: 2 },
  mealTitle: { ...typography.bodyMedium, color: colors.text },
  mealMeta: { ...typography.caption, color: colors.textSecondary },
});
