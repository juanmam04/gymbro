import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { MEAL_TYPE_LABELS, QUERY_KEYS } from '@/constants';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';
import { createMeal, fetchRecentMeals, mealItemsToEditable } from '@/services/meals';
import type { MealWithDetails } from '@/types/database';
import type { EditableFoodItem } from '@/types/nutrition';
import { createLocalId, recalculateItem, sumTotals } from '@/utils/nutrition';
import { getHumanErrorMessage } from '@/utils/errors';

export default function RepeatMealScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<MealWithDetails | null>(null);
  const [items, setItems] = useState<EditableFoodItem[]>([]);

  const recentQuery = useQuery({
    queryKey: ['recentMeals', user?.id],
    queryFn: () => fetchRecentMeals(user!.id, 30),
    enabled: Boolean(user?.id),
  });

  const totals = useMemo(() => sumTotals(items), [items]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user || !selected) throw new Error('No hay comida seleccionada');
      if (items.length === 0) throw new Error('Agregá al menos un alimento');
      const freshItems = items.map((item) => ({
        ...item,
        localId: createLocalId(),
        source: 'manual' as const,
      }));
      return createMeal({
        userId: user.id,
        imageUrl: selected.image_url,
        items: freshItems,
        mealType: selected.meal_type,
        scanStatus: 'edited',
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed(user?.id) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.todayTotals(user?.id) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.weekTotals(user?.id) }),
        queryClient.invalidateQueries({ queryKey: ['recentMeals', user?.id] }),
      ]);
      router.replace('/(tabs)');
    },
    onError: (err) => {
      Alert.alert('No se pudo repetir', getHumanErrorMessage(err));
    },
  });

  const openEditor = (meal: MealWithDetails) => {
    setSelected(meal);
    setItems(
      mealItemsToEditable(meal.meal_items).map((item) => ({
        ...item,
        localId: createLocalId(),
      })),
    );
  };

  if (selected) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Pressable onPress={() => setSelected(null)}>
              <Ionicons name="chevron-back" size={28} color={colors.text} />
            </Pressable>
            <Text style={styles.title}>Repetir comida</Text>
            <View style={{ width: 28 }} />
          </View>

          {selected.image_url ? (
            <Image source={{ uri: selected.image_url }} style={styles.image} contentFit="cover" />
          ) : null}

          <Text style={styles.subtitle}>
            {MEAL_TYPE_LABELS[selected.meal_type]} · podés ajustar las porciones
          </Text>

          <View style={styles.list}>
            {items.map((item) => (
              <View key={item.localId} style={styles.itemCard}>
                <Text style={styles.itemName}>{item.name}</Text>
                <View style={styles.itemRow}>
                  <TextInput
                    style={styles.gramsInput}
                    keyboardType="number-pad"
                    value={String(Math.round(item.grams))}
                    onChangeText={(text) => {
                      const grams = Number(text) || 0;
                      setItems((prev) =>
                        prev.map((i) =>
                          i.localId === item.localId ? recalculateItem(i, grams) : i,
                        ),
                      );
                    }}
                  />
                  <Text style={styles.gramsUnit}>g</Text>
                  <Text style={styles.itemMeta}>
                    {Math.round(item.calories)} kcal
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.totals}>
            <Text style={styles.totalsText}>
              {Math.round(totals.calories)} kcal · P {Math.round(totals.protein)}g · C{' '}
              {Math.round(totals.carbs)}g · G {Math.round(totals.fat)}g
            </Text>
          </View>

          <Button title="Registrar de nuevo" loading={save.isPending} onPress={() => save.mutate()} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Repetir comida</Text>
          <View style={{ width: 28 }} />
        </View>

        <Text style={styles.hint}>Elegí una comida reciente para registrarla otra vez.</Text>

        {recentQuery.isLoading ? <LoadingState /> : null}
        {recentQuery.isError ? (
          <ErrorState
            message={getHumanErrorMessage(recentQuery.error)}
            onRetry={() => recentQuery.refetch()}
          />
        ) : null}

        {!recentQuery.isLoading && !recentQuery.isError && (recentQuery.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="Sin comidas recientes"
            description="Registrá tu primera comida y después podrás repetirla acá."
            actionLabel="Volver"
            onAction={() => router.back()}
          />
        ) : null}

        <View style={styles.list}>
          {recentQuery.data?.map((meal) => (
            <Pressable key={meal.id} style={styles.mealRow} onPress={() => openEditor(meal)}>
              {meal.image_url ? (
                <Image source={{ uri: meal.image_url }} style={styles.thumb} contentFit="cover" />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]}>
                  <Ionicons name="restaurant-outline" size={22} color={colors.textTertiary} />
                </View>
              )}
              <View style={styles.mealInfo}>
                <Text style={styles.mealTitle}>{MEAL_TYPE_LABELS[meal.meal_type]}</Text>
                <Text style={styles.mealMeta}>
                  {format(new Date(meal.eaten_at), "d MMM · HH:mm", { locale: es })} ·{' '}
                  {Math.round(meal.total_calories)} kcal
                </Text>
                <Text style={styles.mealFoods} numberOfLines={1}>
                  {meal.meal_items.map((i) => i.food_name).join(' · ') || 'Sin detalle'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
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
  hint: { ...typography.body, color: colors.textSecondary },
  subtitle: { ...typography.body, color: colors.textSecondary },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  list: { gap: spacing.sm },
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
  thumb: { width: 56, height: 56, borderRadius: radius.sm },
  thumbPlaceholder: {
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealInfo: { flex: 1, gap: 2 },
  mealTitle: { ...typography.bodyMedium, color: colors.text },
  mealMeta: { ...typography.caption, color: colors.textSecondary },
  mealFoods: { ...typography.caption, color: colors.textTertiary },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  itemName: { ...typography.bodyMedium, color: colors.text },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  gramsInput: {
    ...typography.bodyMedium,
    minWidth: 48,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    color: colors.text,
  },
  gramsUnit: { ...typography.caption, color: colors.textSecondary },
  itemMeta: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  totals: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  totalsText: { ...typography.bodyMedium, color: colors.text },
});
