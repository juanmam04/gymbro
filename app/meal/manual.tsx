import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MEAL_TYPE_LABELS, QUERY_KEYS } from '@/constants';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';
import { createMeal } from '@/services/meals';
import type { EditableFoodItem } from '@/types/nutrition';
import type { MealType } from '@/types/database';
import { createLocalId, inferMealType, round1, sumTotals } from '@/utils/nutrition';
import { getHumanErrorMessage } from '@/utils/errors';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];

interface DraftFood {
  name: string;
  grams: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

const EMPTY_DRAFT: DraftFood = {
  name: '',
  grams: '100',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
};

function draftToItem(draft: DraftFood): EditableFoodItem | null {
  const name = draft.name.trim();
  if (!name) return null;
  const grams = Math.max(Number(draft.grams) || 0, 1);
  const calories = Number(draft.calories) || 0;
  const protein = Number(draft.protein) || 0;
  const carbs = Number(draft.carbs) || 0;
  const fat = Number(draft.fat) || 0;
  return {
    localId: createLocalId(),
    name,
    grams,
    calories: round1(calories),
    protein: round1(protein),
    carbs: round1(carbs),
    fat: round1(fat),
    confidence: null,
    source: 'manual',
    perGram: {
      calories: calories / grams,
      protein: protein / grams,
      carbs: carbs / grams,
      fat: fat / grams,
    },
  };
}

export default function ManualMealScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mealType, setMealType] = useState<MealType>(inferMealType());
  const [items, setItems] = useState<EditableFoodItem[]>([]);
  const [draft, setDraft] = useState<DraftFood>(EMPTY_DRAFT);
  const [showForm, setShowForm] = useState(false);

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

  const addFood = () => {
    const item = draftToItem(draft);
    if (!item) {
      Alert.alert('Completá el nombre', 'Ingresá al menos el nombre del alimento.');
      return;
    }
    setItems((prev) => [...prev, item]);
    setDraft(EMPTY_DRAFT);
    setShowForm(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Ionicons name="chevron-back" size={28} color={colors.text} />
            </Pressable>
            <Text style={styles.title}>Carga manual</Text>
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

          <Text style={styles.sectionLabel}>Alimentos</Text>
          {items.length === 0 ? (
            <Text style={styles.hint}>Todavía no agregaste alimentos.</Text>
          ) : (
            <View style={styles.list}>
              {items.map((item) => (
                <View key={item.localId} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Pressable
                      onPress={() => setItems((prev) => prev.filter((i) => i.localId !== item.localId))}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </Pressable>
                  </View>
                  <Text style={styles.itemMeta}>
                    {Math.round(item.grams)} g · {Math.round(item.calories)} kcal · P {Math.round(item.protein)}g · C{' '}
                    {Math.round(item.carbs)}g · G {Math.round(item.fat)}g
                  </Text>
                </View>
              ))}
            </View>
          )}

          {showForm ? (
            <View style={styles.form}>
              <Input
                label="Nombre"
                placeholder="Ej. Pechuga de pollo"
                value={draft.name}
                onChangeText={(name) => setDraft((d) => ({ ...d, name }))}
              />
              <Input
                label="Gramos"
                keyboardType="decimal-pad"
                value={draft.grams}
                onChangeText={(grams) => setDraft((d) => ({ ...d, grams }))}
              />
              <View style={styles.macroRow}>
                <View style={styles.macroField}>
                  <Input
                    label="Kcal"
                    keyboardType="decimal-pad"
                    value={draft.calories}
                    onChangeText={(calories) => setDraft((d) => ({ ...d, calories }))}
                  />
                </View>
                <View style={styles.macroField}>
                  <Input
                    label="Proteína (g)"
                    keyboardType="decimal-pad"
                    value={draft.protein}
                    onChangeText={(protein) => setDraft((d) => ({ ...d, protein }))}
                  />
                </View>
              </View>
              <View style={styles.macroRow}>
                <View style={styles.macroField}>
                  <Input
                    label="Carbos (g)"
                    keyboardType="decimal-pad"
                    value={draft.carbs}
                    onChangeText={(carbs) => setDraft((d) => ({ ...d, carbs }))}
                  />
                </View>
                <View style={styles.macroField}>
                  <Input
                    label="Grasas (g)"
                    keyboardType="decimal-pad"
                    value={draft.fat}
                    onChangeText={(fat) => setDraft((d) => ({ ...d, fat }))}
                  />
                </View>
              </View>
              <View style={styles.formActions}>
                <Button title="Agregar" onPress={addFood} />
                <Button title="Cancelar" variant="ghost" onPress={() => setShowForm(false)} />
              </View>
            </View>
          ) : (
            <Button title="Agregar alimento" variant="secondary" onPress={() => setShowForm(true)} />
          )}

          <View style={styles.totals}>
            <Total label="CALORÍAS" value={`${Math.round(totals.calories)}`} />
            <Total label="PROTEÍNA" value={`${Math.round(totals.protein)} g`} />
            <Total label="CARBOS" value={`${Math.round(totals.carbs)} g`} />
            <Total label="GRASAS" value={`${Math.round(totals.fat)} g`} />
          </View>

          <Button
            title="Guardar comida"
            loading={save.isPending}
            onPress={() => save.mutate()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.totalItem}>
      <Text style={styles.totalLabel}>{label}</Text>
      <Text style={styles.totalValue}>{value}</Text>
    </View>
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
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chipText: { ...typography.caption, color: colors.textSecondary },
  chipTextSelected: { color: colors.primary },
  hint: { ...typography.body, color: colors.textTertiary },
  list: { gap: spacing.sm },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { ...typography.bodyMedium, color: colors.text, flex: 1 },
  itemMeta: { ...typography.caption, color: colors.textSecondary },
  form: { gap: spacing.md },
  macroRow: { flexDirection: 'row', gap: spacing.sm },
  macroField: { flex: 1 },
  formActions: { gap: spacing.sm },
  totals: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  totalItem: {
    width: '48%',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  totalLabel: { ...typography.caption, color: colors.textTertiary, letterSpacing: 0.5 },
  totalValue: { ...typography.h3, color: colors.text, marginTop: 4 },
});
