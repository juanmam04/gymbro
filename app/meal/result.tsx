import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
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
import { QUERY_KEYS } from '@/constants';
import { bandLabel } from '@/features/nutrition/services/nutritionMath';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';
import { createMeal, uploadMealImage } from '@/services/meals';
import { useScanDraftStore } from '@/stores/scan-draft';
import { createManualFood, recalculateItem, scaleItemByFactor, sumTotals } from '@/utils/nutrition';
import { getErrorMessage } from '@/utils/errors';
import type { ConfidenceBand, EditableFoodItem } from '@/types/nutrition';

export default function MealResultScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const imageUri = useScanDraftStore((s) => s.imageUri);
  const scanResult = useScanDraftStore((s) => s.scanResult);
  const items = useScanDraftStore((s) => s.items);
  const clarifications = useScanDraftStore((s) => s.clarifications);
  const clarificationAnswers = useScanDraftStore((s) => s.clarificationAnswers);
  const setItems = useScanDraftStore((s) => s.setItems);
  const answerClarification = useScanDraftStore((s) => s.answerClarification);
  const reset = useScanDraftStore((s) => s.reset);
  const isPublishing = useScanDraftStore((s) => s.isPublishing);
  const setPublishing = useScanDraftStore((s) => s.setPublishing);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const totals = useMemo(() => sumTotals(items), [items]);
  const pendingClarifications = clarifications.filter((c) => !clarificationAnswers[c.id]);
  const hasLowConfidence = items.some((i) => i.confidenceBand === 'low');

  const publish = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Sin sesión');
      if (items.length === 0) throw new Error('Agregá al menos un alimento');
      if (hasLowConfidence) {
        // Soft gate — caller confirms via Alert before mutate when needed
      }
      setPublishing(true);
      const imageUrl = imageUri ? await uploadMealImage(user.id, imageUri) : null;
      return createMeal({
        userId: user.id,
        imageUrl,
        items,
        scanStatus: 'edited',
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed(user?.id) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.todayTotals(user?.id) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.weekTotals(user?.id) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.mealsSince(user?.id) }),
        queryClient.invalidateQueries({ queryKey: ['weeklyReport'] }),
        queryClient.invalidateQueries({ queryKey: ['coachMeals'] }),
        queryClient.invalidateQueries({ queryKey: ['challengeMeals'] }),
        queryClient.invalidateQueries({ queryKey: ['subscription'] }),
      ]);
      reset();
      router.replace('/(tabs)');
    },
    onError: (err) => {
      setPublishing(false);
      Alert.alert('No se pudo registrar', getErrorMessage(err));
    },
  });

  const confirmPublish = () => {
    if (hasLowConfidence) {
      Alert.alert(
        'Revisá antes de registrar',
        'Algunos alimentos tienen baja confianza. ¿Confirmás igual?',
        [
          { text: 'Seguir editando', style: 'cancel' },
          { text: 'Registrar', onPress: () => publish.mutate() },
        ],
      );
      return;
    }
    publish.mutate();
  };

  if (!imageUri && items.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Text style={styles.title}>No hay scan pendiente</Text>
          <Button title="Ir a Scan" onPress={() => router.replace('/(tabs)/scan')} />
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
            <Text style={styles.title}>Esto es lo que encontramos</Text>
            <View style={{ width: 28 }} />
          </View>

          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} contentFit="cover" />
          ) : null}

          {scanResult?.dishName ? <Text style={styles.dish}>{scanResult.dishName}</Text> : null}
          <Text style={styles.estimate}>Estimación aproximada · podés corregir todo</Text>

          {pendingClarifications.map((c) => (
            <View key={c.id} style={styles.clarify}>
              <Text style={styles.clarifyQ}>{c.question}</Text>
              <View style={styles.clarifyRow}>
                {c.options.map((opt) => (
                  <Pressable
                    key={opt.id}
                    style={styles.clarifyChip}
                    onPress={() => answerClarification(c.id, opt.id)}
                  >
                    <Text style={styles.clarifyChipText}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

          <View style={styles.list}>
            {items.map((item) => (
              <FoodItemCard
                key={item.localId}
                item={item}
                expanded={editingId === item.localId}
                onToggle={() => setEditingId(editingId === item.localId ? null : item.localId)}
                onChange={(next) =>
                  setItems(items.map((i) => (i.localId === item.localId ? next : i)))
                }
                onRemove={() => setItems(items.filter((i) => i.localId !== item.localId))}
              />
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
                  setItems([...items, createManualFood(newName.trim(), 100)]);
                  setNewName('');
                  setAdding(false);
                }}
              />
            </View>
          ) : (
            <Button title="Agregar alimento" variant="secondary" onPress={() => setAdding(true)} />
          )}

          <View style={styles.totals}>
            <Total label="CALORÍAS" value={`≈ ${Math.round(totals.calories)}`} />
            <Total label="PROTEÍNA" value={`${Math.round(totals.protein)} g`} />
            <Total label="CARBOS" value={`${Math.round(totals.carbs)} g`} />
            <Total label="GRASAS" value={`${Math.round(totals.fat)} g`} />
          </View>

          <Button
            title="Registrar comida"
            loading={isPublishing || publish.isPending}
            onPress={confirmPublish}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FoodItemCard({
  item,
  expanded,
  onToggle,
  onChange,
  onRemove,
}: {
  item: EditableFoodItem;
  expanded: boolean;
  onToggle: () => void;
  onChange: (item: EditableFoodItem) => void;
  onRemove: () => void;
}) {
  const hint = item.confidenceBand ? bandLabel(item.confidenceBand as ConfidenceBand) : null;

  return (
    <View style={styles.item}>
      <Pressable onPress={onToggle}>
        <Text style={styles.itemName}>{item.name.toUpperCase()}</Text>
        <Text style={styles.itemMacros}>
          {item.count && item.count > 1
            ? `${item.count} u · ≈${Math.round(item.gramsPerUnit ?? item.grams / item.count)} g c/u · ≈ ${Math.round(item.grams)} g`
            : `≈ ${Math.round(item.grams)} g`}
          {' · '}≈ {Math.round(item.calories)} kcal
        </Text>
        {hint ? <Text style={styles.bandHint}>{hint}</Text> : null}
      </Pressable>

      {expanded ? (
        <View style={styles.editBlock}>
          <TextInput
            style={styles.itemNameInput}
            value={item.name}
            onChangeText={(name) => onChange({ ...item, name, source: 'edited' })}
          />
          <View style={styles.quickRow}>
            {[
              { label: '½', factor: 0.5 },
              { label: 'x1', factor: 1 },
              { label: 'x1.5', factor: 1.5 },
              { label: 'x2', factor: 2 },
            ].map((q) => (
              <Pressable
                key={q.label}
                style={styles.quickChip}
                onPress={() => {
                  const base = item.aiEstimatedGrams ?? item.grams;
                  onChange(recalculateItem({ ...item, grams: base }, base * q.factor));
                }}
              >
                <Text style={styles.quickChipText}>{q.label}</Text>
              </Pressable>
            ))}
          </View>
          {item.count && item.count > 1 ? (
            <View style={styles.quickRow}>
              {[
                { label: '−1', delta: -1 },
                { label: '+1', delta: 1 },
              ].map((q) => (
                <Pressable
                  key={q.label}
                  style={styles.quickChip}
                  onPress={() => {
                    const unit = item.gramsPerUnit ?? item.grams / Math.max(item.count ?? 1, 1);
                    const nextCount = Math.max(1, (item.count ?? 1) + q.delta);
                    const next = recalculateItem(item, unit * nextCount);
                    const baseName = item.name.replace(/\s*\(×\d+\)\s*$/, '').trim();
                    onChange({
                      ...next,
                      count: nextCount,
                      gramsPerUnit: unit,
                      name: nextCount > 1 ? `${baseName} (×${nextCount})` : baseName,
                    });
                  }}
                >
                  <Text style={styles.quickChipText}>{q.label} u</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={styles.itemRow}>
            <View style={styles.gramsWrap}>
              <TextInput
                style={styles.gramsInput}
                keyboardType="number-pad"
                value={String(Math.round(item.grams))}
                onChangeText={(text) => onChange(recalculateItem(item, Number(text) || 0))}
              />
              <Text style={styles.gramsUnit}>g</Text>
            </View>
            <Pressable onPress={() => onChange(scaleItemByFactor(item, 1.1))}>
              <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
            </Pressable>
            <Pressable onPress={() => onChange(scaleItemByFactor(item, 0.9))}>
              <Ionicons name="remove-circle-outline" size={24} color={colors.primary} />
            </Pressable>
            <Pressable onPress={onRemove}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
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
  empty: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { ...typography.h2, color: colors.text, flex: 1, textAlign: 'center' },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  dish: { ...typography.h3, color: colors.text },
  estimate: { ...typography.caption, color: colors.textSecondary },
  clarify: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  clarifyQ: { ...typography.bodyMedium, color: colors.text },
  clarifyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  clarifyChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  clarifyChipText: { ...typography.caption, color: colors.text },
  list: { gap: spacing.md },
  item: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  itemName: { ...typography.bodyMedium, color: colors.text, letterSpacing: 0.3 },
  itemNameInput: { ...typography.bodyMedium, color: colors.text, padding: 0 },
  itemMacros: { ...typography.caption, color: colors.textSecondary },
  bandHint: { ...typography.caption, color: colors.warning },
  editBlock: { gap: spacing.sm, marginTop: spacing.sm },
  quickRow: { flexDirection: 'row', gap: spacing.sm },
  quickChip: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  quickChipText: { ...typography.caption, color: colors.text },
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
