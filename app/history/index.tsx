import { useQuery } from '@tanstack/react-query';
import { format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { MEAL_TYPE_LABELS, QUERY_KEYS } from '@/constants';
import { lastNDayKeys } from '@/features/streaks/calculateStreaks';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';
import { fetchMealsForDay } from '@/services/meals';
import { getHumanErrorMessage } from '@/utils/errors';

function dayLabel(key: string): string {
  const date = new Date(`${key}T12:00:00`);
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  if (key === todayKey) return 'Hoy';
  return format(date, 'EEE', { locale: es });
}

export default function HistoryScreen() {
  const { user } = useAuth();
  const dayKeys = useMemo(() => lastNDayKeys(7), []);
  const [selectedDay, setSelectedDay] = useState(dayKeys[dayKeys.length - 1]);

  const dayQuery = useQuery({
    queryKey: QUERY_KEYS.dayMeals(user?.id, selectedDay),
    queryFn: async () => {
      const start = startOfDay(new Date(`${selectedDay}T12:00:00`));
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return fetchMealsForDay(user!.id, start.toISOString(), end.toISOString());
    },
    enabled: Boolean(user?.id && selectedDay),
  });

  const dayTotals = useMemo(() => {
    const meals = dayQuery.data ?? [];
    return meals.reduce(
      (acc, meal) => ({
        calories: acc.calories + Number(meal.total_calories),
        count: acc.count + 1,
      }),
      { calories: 0, count: 0 },
    );
  }, [dayQuery.data]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Historial</Text>
          <View style={{ width: 28 }} />
        </View>

        <Text style={styles.subtitle}>Últimos 7 días</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {dayKeys.map((key) => {
            const selected = key === selectedDay;
            const date = new Date(`${key}T12:00:00`);
            return (
              <Pressable
                key={key}
                onPress={() => setSelectedDay(key)}
                style={[styles.dayChip, selected && styles.dayChipSelected]}
              >
                <Text style={[styles.dayChipLabel, selected && styles.dayChipLabelSelected]}>
                  {dayLabel(key)}
                </Text>
                <Text style={[styles.dayChipDate, selected && styles.dayChipLabelSelected]}>
                  {format(date, 'd/M', { locale: es })}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>
            {format(new Date(`${selectedDay}T12:00:00`), "EEEE d 'de' MMMM", { locale: es })}
          </Text>
          <Text style={styles.summaryMeta}>
            {dayTotals.count} comida{dayTotals.count === 1 ? '' : 's'} · {Math.round(dayTotals.calories)} kcal
          </Text>
        </View>

        {dayQuery.isLoading ? <LoadingState message="Cargando día…" /> : null}
        {dayQuery.isError ? (
          <ErrorState
            message={getHumanErrorMessage(dayQuery.error)}
            onRetry={() => dayQuery.refetch()}
          />
        ) : null}

        {!dayQuery.isLoading && !dayQuery.isError && (dayQuery.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="Sin registros"
            description="No hay comidas para este día."
          />
        ) : null}

        <View style={styles.list}>
          {dayQuery.data?.map((meal) => (
            <Pressable
              key={meal.id}
              style={styles.mealRow}
              onPress={() => router.push(`/meal/${meal.id}`)}
            >
              <View style={styles.mealInfo}>
                <Text style={styles.mealTitle}>{MEAL_TYPE_LABELS[meal.meal_type]}</Text>
                <Text style={styles.mealMeta}>
                  {format(new Date(meal.eaten_at), 'HH:mm', { locale: es })} ·{' '}
                  {Math.round(meal.total_calories)} kcal
                </Text>
                <Text style={styles.mealFoods} numberOfLines={1}>
                  {meal.meal_items.map((i) => i.food_name).join(' · ') || 'Sin detalle'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </Pressable>
          ))}
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
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary },
  strip: { gap: spacing.sm, paddingVertical: spacing.xs },
  dayChip: {
    minWidth: 72,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayChipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  dayChipLabel: { ...typography.label, color: colors.textSecondary, textTransform: 'capitalize' },
  dayChipLabelSelected: { color: colors.primary },
  dayChipDate: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
  summary: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  summaryTitle: { ...typography.bodyMedium, color: colors.text, textTransform: 'capitalize' },
  summaryMeta: { ...typography.caption, color: colors.textSecondary },
  list: { gap: spacing.sm },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  mealInfo: { flex: 1, gap: 2 },
  mealTitle: { ...typography.bodyMedium, color: colors.text },
  mealMeta: { ...typography.caption, color: colors.textSecondary },
  mealFoods: { ...typography.caption, color: colors.textTertiary },
});
