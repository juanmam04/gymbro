import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { LoadingState } from '@/components/ui/LoadingState';
import { MEAL_TYPE_LABELS, QUERY_KEYS } from '@/constants';
import {
  getFoodSearchProvider,
  scaleFoodToGrams,
  type FoodSearchResult,
} from '@/features/food/food-search-provider';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';
import { createMeal } from '@/services/meals';
import type { EditableFoodItem } from '@/types/nutrition';
import type { MealType } from '@/types/database';
import { createLocalId, inferMealType, recalculateItem, round1, sumTotals } from '@/utils/nutrition';
import { getHumanErrorMessage } from '@/utils/errors';

function foodToEditable(food: FoodSearchResult, grams: number): EditableFoodItem {
  const scaled = scaleFoodToGrams(food, grams);
  const safeGrams = Math.max(grams, 1);
  return {
    localId: createLocalId(),
    name: scaled.name,
    grams: safeGrams,
    calories: scaled.calories,
    protein: scaled.protein,
    carbs: scaled.carbs,
    fat: scaled.fat,
    confidence: null,
    source: 'manual',
    perGram: {
      calories: scaled.calories / safeGrams,
      protein: scaled.protein / safeGrams,
      carbs: scaled.carbs / safeGrams,
      fat: scaled.fat / safeGrams,
    },
  };
}

export default function MealSearchScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [mealType] = useState<MealType>(inferMealType());
  const [items, setItems] = useState<EditableFoodItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);
  const [gramsInput, setGramsInput] = useState('100');

  const searchQuery = useQuery({
    queryKey: ['foodSearch', debouncedQuery],
    queryFn: () => getFoodSearchProvider().search(debouncedQuery),
    enabled: debouncedQuery.length >= 0,
  });

  const totals = useMemo(() => sumTotals(items), [items]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No hay sesión');
      if (items.length === 0) throw new Error('Agregá al menos un alimento');
      return createMeal({
        userId: user.id,
        items,
        mealType,
        scanStatus: 'edited',
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed(user?.id) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.todayTotals(user?.id) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.weekTotals(user?.id) }),
      ]);
      router.replace('/(tabs)');
    },
    onError: (err) => {
      Alert.alert('No se pudo guardar', getHumanErrorMessage(err));
    },
  });

  const handleSearch = (text: string) => {
    setQuery(text);
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      setDebouncedQuery('');
      return;
    }
    setTimeout(() => setDebouncedQuery(trimmed), 300);
  };

  const confirmFood = () => {
    if (!selectedFood) return;
    const grams = Math.max(Number(gramsInput) || 0, 1);
    setItems((prev) => [...prev, foodToEditable(selectedFood, grams)]);
    setSelectedFood(null);
    setGramsInput('100');
    setQuery('');
    setDebouncedQuery('');
  };

  if (selectedFood) {
    const previewGrams = Math.max(Number(gramsInput) || 0, 1);
    const preview = scaleFoodToGrams(selectedFood, previewGrams);
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Pressable onPress={() => setSelectedFood(null)}>
              <Ionicons name="chevron-back" size={28} color={colors.text} />
            </Pressable>
            <Text style={styles.title}>{selectedFood.name}</Text>
            <View style={{ width: 28 }} />
          </View>

          <Text style={styles.hint}>
            Porción de referencia: {selectedFood.servingGrams} g
          </Text>

          <View style={styles.gramsWrap}>
            <Text style={styles.gramsLabel}>Gramos</Text>
            <TextInput
              style={styles.gramsInput}
              keyboardType="decimal-pad"
              value={gramsInput}
              onChangeText={setGramsInput}
            />
          </View>

          <View style={styles.preview}>
            <Text style={styles.previewLine}>{Math.round(preview.calories)} kcal</Text>
            <Text style={styles.previewMeta}>
              P {round1(preview.protein)}g · C {round1(preview.carbs)}g · G {round1(preview.fat)}g
            </Text>
          </View>

          <Button title="Agregar a la comida" onPress={confirmFood} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={28} color={colors.text} />
            </Pressable>
            <Text style={styles.title}>Buscar alimento</Text>
            <View style={{ width: 28 }} />
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre…"
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={handleSearch}
            autoFocus
          />

          {searchQuery.isLoading ? <LoadingState message="Buscando…" /> : null}

          {!searchQuery.isLoading && (searchQuery.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon="search-outline"
              title="Sin resultados"
              description="Probá con otro nombre."
            />
          ) : null}

          <View style={styles.results}>
            {searchQuery.data?.map((food) => (
              <Pressable
                key={food.id}
                style={styles.resultRow}
                onPress={() => {
                  setSelectedFood(food);
                  setGramsInput(String(food.servingGrams));
                }}
              >
                <View style={styles.resultText}>
                  <Text style={styles.resultName}>{food.name}</Text>
                  {food.brand ? <Text style={styles.resultBrand}>{food.brand}</Text> : null}
                  <Text style={styles.resultMeta}>
                    {food.servingGrams} g · {food.calories} kcal
                  </Text>
                </View>
                <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
              </Pressable>
            ))}
          </View>

          {items.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>
                Tu comida ({MEAL_TYPE_LABELS[mealType]})
              </Text>
              <View style={styles.list}>
                {items.map((item) => (
                  <View key={item.localId} style={styles.itemCard}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <View style={styles.itemRow}>
                      <TextInput
                        style={styles.itemGrams}
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
                      <Text style={styles.itemMeta}>
                        {Math.round(item.calories)} kcal
                      </Text>
                      <Pressable
                        onPress={() =>
                          setItems((prev) => prev.filter((i) => i.localId !== item.localId))
                        }
                      >
                        <Ionicons name="trash-outline" size={20} color={colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.totalsRow}>
                <Text style={styles.totalsText}>
                  Total: {Math.round(totals.calories)} kcal · P {Math.round(totals.protein)}g
                </Text>
              </View>

              <Button
                title="Guardar comida"
                loading={save.isPending}
                onPress={() => save.mutate()}
              />
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { ...typography.h2, color: colors.text, flex: 1, textAlign: 'center' },
  searchInput: {
    ...typography.body,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  results: { gap: spacing.sm },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  resultText: { flex: 1, gap: 2 },
  resultName: { ...typography.bodyMedium, color: colors.text },
  resultBrand: { ...typography.caption, color: colors.textTertiary },
  resultMeta: { ...typography.caption, color: colors.textSecondary },
  sectionLabel: { ...typography.label, color: colors.textSecondary },
  list: { gap: spacing.sm },
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
  itemGrams: {
    ...typography.bodyMedium,
    minWidth: 56,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    color: colors.text,
  },
  itemMeta: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  totalsRow: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.md },
  totalsText: { ...typography.bodyMedium, color: colors.text },
  hint: { ...typography.body, color: colors.textSecondary },
  gramsWrap: { gap: spacing.sm },
  gramsLabel: { ...typography.label, color: colors.textSecondary },
  gramsInput: {
    ...typography.h3,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    minHeight: 56,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  preview: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  previewLine: { ...typography.h2, color: colors.primary },
  previewMeta: { ...typography.body, color: colors.textSecondary },
});
