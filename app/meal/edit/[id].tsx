import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { MEAL_TYPE_LABELS, QUERY_KEYS } from '@/constants';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';
import { fetchMealById, mealItemsToEditable, updateMeal } from '@/services/meals';
import type { EditableFoodItem } from '@/types/nutrition';
import type { MealType } from '@/types/database';
import { createManualFood, recalculateItem, sumTotals } from '@/utils/nutrition';
import { getHumanErrorMessage } from '@/utils/errors';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];

export default function EditMealScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [items, setItems] = useState<EditableFoodItem[]>([]);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const mealQuery = useQuery({
    queryKey: QUERY_KEYS.meal(id),
    queryFn: () => fetchMealById(id!),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!mealQuery.data) return;
    setMealType(mealQuery.data.meal_type);
    setItems(mealItemsToEditable(mealQuery.data.meal_items));
  }, [mealQuery.data]);

  const totals = useMemo(() => sumTotals(items), [items]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error('No hay sesión');
      if (items.length === 0) throw new Error('Agregá al menos un alimento');
      return updateMeal({
        mealId: id,
        userId: user.id,
        mealType,
        items,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.meal(id) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed(user?.id) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.todayTotals(user?.id) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.weekTotals(user?.id) }),
      ]);
      router.replace(`/meal/${id}`);
    },
    onError: (err) => Alert.alert('No se pudo guardar', getHumanErrorMessage(err)),
  });

  if (mealQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (mealQuery.isError || !mealQuery.data) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState
          message={getHumanErrorMessage(mealQuery.error, 'No encontramos esa comida.')}
          onRetry={() => mealQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  if (mealQuery.data.user_id !== user?.id) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState message="Solo podés editar tus propias comidas." />
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
            <Text style={styles.title}>Editar comida</Text>
            <View style={{ width: 28 }} />
          </View>

          <Text style={styles.sectionLabel}>Tipo de comida</Text>
          <View style={styles.chips}>
            {MEAL_TYPES.map((type) => {
              const selected = mealType === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => setMealType(type)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {MEAL_TYPE_LABELS[type]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.list}>
            {items.map((item) => (
              <View key={item.localId} style={styles.itemCard}>
                <TextInput
                  style={styles.itemName}
                  value={item.name}
                  onChangeText={(name) =>
                    setItems((prev) =>
                      prev.map((i) =>
                        i.localId === item.localId ? { ...i, name, source: 'edited' } : i,
                      ),
                    )
                  }
                />
                <View style={styles.itemRow}>
                  <View style={styles.gramsWrap}>
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
                  </View>
                  <Text style={styles.itemMeta}>
                    {Math.round(item.calories)} kcal · P {Math.round(item.protein)}g
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

          {adding ? (
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                placeholder="Nombre del alimento"
                placeholderTextColor={colors.textTertiary}
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />
              <Button
                title="Agregar"
                onPress={() => {
                  if (!newName.trim()) return;
                  setItems((prev) => [...prev, createManualFood(newName.trim(), 100)]);
                  setNewName('');
                  setAdding(false);
                }}
              />
            </View>
          ) : (
            <Button title="Agregar alimento" variant="secondary" onPress={() => setAdding(true)} />
          )}

          <View style={styles.totals}>
            <Text style={styles.totalsText}>
              {Math.round(totals.calories)} kcal · P {Math.round(totals.protein)}g · C{' '}
              {Math.round(totals.carbs)}g · G {Math.round(totals.fat)}g
            </Text>
          </View>

          <Button title="Guardar cambios" loading={save.isPending} onPress={() => save.mutate()} />
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
  title: { ...typography.h2, color: colors.text },
  sectionLabel: { ...typography.label, color: colors.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { ...typography.caption, color: colors.textSecondary },
  chipTextSelected: { color: colors.primary },
  list: { gap: spacing.sm },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  itemName: { ...typography.bodyMedium, color: colors.text, padding: 0 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  gramsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
  },
  gramsInput: {
    ...typography.bodyMedium,
    minWidth: 48,
    color: colors.text,
    paddingVertical: 6,
  },
  gramsUnit: { ...typography.caption, color: colors.textSecondary },
  itemMeta: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  addRow: { gap: spacing.sm },
  addInput: {
    ...typography.body,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  totals: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  totalsText: { ...typography.bodyMedium, color: colors.text },
});
