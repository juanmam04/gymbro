import { useQuery } from '@tanstack/react-query';
import { format, parseISO, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { NutritionSummary } from '@/features/feed/NutritionSummary';
import { getSimpleDayMessage } from '@/features/privacy/privacy';
import { QUERY_KEYS } from '@/constants';
import { calculatePersonalStreak, countMealsByLocalDay, lastNDayKeys } from '@/features/streaks/calculateStreaks';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';
import { getNutritionGoals } from '@/services/partner';
import { fetchMealsSince, fetchTodayTotals, fetchWeekDailyTotals } from '@/services/meals';
import { fetchTodayWaterMl, fetchWaterSince, waterByDayMap } from '@/services/water';
import { fetchLatestWeight, fetchWeightHistory } from '@/services/weight';
import { getErrorMessage } from '@/utils/errors';

type Scope = 'me' | 'partner';
type Range = 'today' | 'week' | 'month';

export default function ProgressScreen() {
  const { user, partner, goals, profile } = useAuth();
  const [scope, setScope] = useState<Scope>('me');
  const [range, setRange] = useState<Range>('today');
  const displayMode = profile?.nutrition_display_mode ?? 'simple';

  const targetUserId = scope === 'partner' && partner ? partner.id : user?.id;
  const isSelf = targetUserId === user?.id;

  const since = useMemo(() => {
    const d = new Date();
    if (range === 'month') d.setDate(d.getDate() - 30);
    else if (range === 'week') d.setDate(d.getDate() - 6);
    else d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, [range]);

  const goalsQuery = useQuery({
    queryKey: QUERY_KEYS.goals(targetUserId),
    queryFn: () => getNutritionGoals(targetUserId!),
    enabled: Boolean(targetUserId),
  });

  const totalsQuery = useQuery({
    queryKey: [...QUERY_KEYS.todayTotals(targetUserId), scope],
    queryFn: () => fetchTodayTotals(targetUserId!),
    enabled: Boolean(targetUserId) && range === 'today',
  });

  const weekQuery = useQuery({
    queryKey: [...QUERY_KEYS.weekTotals(targetUserId), scope],
    queryFn: () => fetchWeekDailyTotals(targetUserId!),
    enabled: Boolean(targetUserId) && range !== 'today',
  });

  const waterQuery = useQuery({
    queryKey: QUERY_KEYS.waterToday(targetUserId),
    queryFn: () => fetchTodayWaterMl(targetUserId!),
    enabled: Boolean(targetUserId) && isSelf && range === 'today',
  });

  const waterHistoryQuery = useQuery({
    queryKey: ['waterHistory', targetUserId, range],
    queryFn: () => fetchWaterSince(targetUserId!, since),
    enabled: Boolean(targetUserId) && isSelf && range !== 'today',
  });

  const weightQuery = useQuery({
    queryKey: QUERY_KEYS.weightLatest(targetUserId),
    queryFn: () => fetchLatestWeight(targetUserId!),
    enabled: Boolean(targetUserId) && (isSelf || (partner?.share_weight ?? false)),
  });

  const weightHistoryQuery = useQuery({
    queryKey: QUERY_KEYS.weightHistory(targetUserId),
    queryFn: () => fetchWeightHistory(targetUserId!, subDays(new Date(), 30).toISOString()),
    enabled: Boolean(targetUserId) && (isSelf || (partner?.share_weight ?? false)),
  });

  const mealsQuery = useQuery({
    queryKey: [...QUERY_KEYS.mealsSince(targetUserId), range],
    queryFn: () => fetchMealsSince(targetUserId!, since),
    enabled: Boolean(targetUserId),
  });

  const activeGoals = goalsQuery.data ?? (isSelf ? goals : null);
  const totals = totalsQuery.data ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const mealCountToday = (mealsQuery.data ?? []).filter((m) => {
    return new Date(m.eaten_at).toDateString() === new Date().toDateString();
  }).length;

  const simple = getSimpleDayMessage({
    consumedCalories: totals.calories,
    targetCalories: activeGoals?.calories_target ?? 2200,
    consumedProtein: totals.protein,
    targetProtein: activeGoals?.protein_target ?? 140,
    mealCount: mealCountToday,
  });

  const streakMealsQuery = useQuery({
    queryKey: [...QUERY_KEYS.mealsSince(targetUserId), 'racha-60d'],
    queryFn: () => {
      const start = new Date();
      start.setDate(start.getDate() - 60);
      return fetchMealsSince(targetUserId!, start.toISOString());
    },
    enabled: Boolean(targetUserId),
  });
  const streakMeals = (streakMealsQuery.data ?? []).map((m) => ({ eatenAt: m.eaten_at }));
  const personalStreak = calculatePersonalStreak(streakMeals);
  const days = lastNDayKeys(7);
  const activity = countMealsByLocalDay(streakMeals);

  const maxWeekCalories = useMemo(() => {
    const values = (weekQuery.data ?? []).map((d) => d.calories);
    return Math.max(...values, 1);
  }, [weekQuery.data]);

  if (totalsQuery.isLoading && range === 'today') {
    return <LoadingState message="Cargando progreso…" />;
  }

  if (totalsQuery.isError) {
    return (
      <ErrorState message={getErrorMessage(totalsQuery.error)} onRetry={() => totalsQuery.refetch()} />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Rachas y progreso</Text>

        {partner ? (
          <View style={styles.switchRow}>
            {(['me', 'partner'] as const).map((key) => (
              <Pressable
                key={key}
                onPress={() => setScope(key)}
                style={[styles.switchBtn, scope === key && styles.switchActive]}
              >
                <Text style={[styles.switchText, scope === key && styles.switchTextActive]}>
                  {key === 'me' ? 'Yo' : partner.display_name}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.switchRow}>
          {(
            [
              ['today', 'Hoy'],
              ['week', 'Semana'],
              ['month', 'Mes'],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setRange(key)}
              style={[styles.switchBtn, range === key && styles.switchActive]}
            >
              <Text style={[styles.switchText, range === key && styles.switchTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.streakCard}>
          <Text style={styles.streakKicker}>CONSTANCIA</Text>
          <Text style={styles.streakBig}>🔥 {personalStreak} {personalStreak === 1 ? 'día' : 'días'}</Text>
          <Text style={styles.streakDescription}>Registrá tus comidas y construí tu hábito. La constancia vale más que la perfección.</Text>
          <View style={styles.streakDays}>
            {days.map((day) => {
              const done = (activity.get(day) ?? 0) >= 2;
              return (
                <View key={day} style={styles.streakDay}>
                  <Text style={styles.streakDayLabel}>{format(parseISO(day), 'EEE', { locale: es }).slice(0, 2)}</Text>
                  <View style={[styles.streakCircle, done && styles.streakCircleDone]}>
                    <Text style={[styles.streakMark, done && styles.streakMarkDone]}>{done ? '✓' : '·'}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {range === 'today' ? (
          displayMode === 'detailed' && activeGoals ? (
            <NutritionSummary
              consumed={totals}
              targets={{
                calories: activeGoals.calories_target,
                protein: activeGoals.protein_target,
                carbs: activeGoals.carbs_target,
                fat: activeGoals.fat_target,
              }}
            />
          ) : (
            <View style={styles.simpleCard}>
              <Text style={styles.simpleTitle}>{simple.title}</Text>
              <Text style={styles.simpleDetail}>{simple.detail}</Text>
            </View>
          )
        ) : null}

        {isSelf && range === 'today' ? (
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Agua hoy</Text>
            <Text style={styles.metricValue}>
              {(waterQuery.data ?? 0).toLocaleString('es-AR')} /{' '}
              {(profile?.water_goal_ml ?? 2500).toLocaleString('es-AR')} ml
            </Text>
          </View>
        ) : null}

        {(isSelf || partner?.share_weight) && weightQuery.data ? (
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Último peso</Text>
            <Text style={styles.metricValue}>{weightQuery.data.weight_kg} kg</Text>
            {(weightHistoryQuery.data?.length ?? 0) > 1 ? (
              <Text style={styles.metricHint}>
                {weightHistoryQuery.data!.length} registros en 30 días
              </Text>
            ) : null}
          </View>
        ) : null}

        {range !== 'today' ? (
          <>
            <Text style={styles.section}>Calorías por día</Text>
            <View style={styles.week}>
              {(weekQuery.data ?? []).map((day) => {
                const height = Math.max(8, (day.calories / maxWeekCalories) * 120);
                return (
                  <Pressable
                    key={day.date}
                    style={styles.dayCol}
                    onPress={() => router.push('/history')}
                  >
                    <View style={[styles.bar, { height }]} />
                    <Text style={styles.dayLabel}>
                      {format(parseISO(day.date), 'EEE', { locale: es }).slice(0, 2)}
                    </Text>
                    <Text style={styles.dayValue}>{Math.round(day.calories)}</Text>
                  </Pressable>
                );
              })}
            </View>
            {isSelf && waterHistoryQuery.data ? (
              <Text style={styles.metricHint}>
                Agua promedio ≈{' '}
                {Math.round(
                  [...waterByDayMap(waterHistoryQuery.data).values()].reduce((a, b) => a + b, 0) /
                    Math.max(waterByDayMap(waterHistoryQuery.data).size, 1),
                )}{' '}
                ml/día
              </Text>
            ) : null}
          </>
        ) : null}

        {!activeGoals && scope === 'partner' ? (
          <EmptyState
            title="Progreso privado"
            description="Tu compañero no comparte sus objetivos."
          />
        ) : null}

        <Pressable onPress={() => router.push('/history')}>
          <Text style={styles.link}>Ver historial completo →</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  streakCard: { backgroundColor: '#172A22', borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md },
  streakKicker: { ...typography.label, color: '#C8F56C', letterSpacing: 1 },
  streakBig: { ...typography.h1, color: '#FFFFFF' },
  streakDescription: { ...typography.caption, color: '#DAE9D8' },
  streakDays: { flexDirection: 'row', justifyContent: 'space-between' },
  streakDay: { alignItems: 'center', gap: 8 },
  streakDayLabel: { ...typography.caption, color: '#E0EBDD', textTransform: 'capitalize' },
  streakCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#375442', alignItems: 'center', justifyContent: 'center' },
  streakCircleDone: { backgroundColor: '#C8F56C' },
  streakMark: { ...typography.bodyMedium, color: '#BBD1B9' },
  streakMarkDone: { color: '#172A22' },
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xxxl },
  title: { ...typography.h1, color: colors.text },
  switchRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    padding: 4,
  },
  switchBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.full,
  },
  switchActive: { backgroundColor: colors.surface },
  switchText: { ...typography.label, color: colors.textSecondary },
  switchTextActive: { color: colors.text },
  simpleCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  simpleTitle: { ...typography.h3, color: colors.text },
  simpleDetail: { ...typography.body, color: colors.textSecondary },
  metricCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 4,
  },
  metricLabel: { ...typography.label, color: colors.textSecondary },
  metricValue: { ...typography.h3, color: colors.text },
  metricHint: { ...typography.caption, color: colors.textTertiary },
  section: { ...typography.h3, color: colors.text },
  week: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    minHeight: 180,
  },
  dayCol: { flex: 1, alignItems: 'center', gap: 6 },
  bar: { width: '70%', backgroundColor: colors.accent, borderRadius: 6 },
  dayLabel: { ...typography.caption, color: colors.textSecondary, textTransform: 'capitalize' },
  dayValue: { ...typography.caption, color: colors.textTertiary, fontSize: 10 },
  link: { ...typography.bodyMedium, color: colors.primary },
});
