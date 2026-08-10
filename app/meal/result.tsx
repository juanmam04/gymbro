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
import { colors, radius, spacing, typography } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';
import { createMeal, uploadMealImage } from '@/services/meals';
import { useScanDraftStore } from '@/stores/scan-draft';
import { createManualFood, recalculateItem, sumTotals } from '@/utils/nutrition';
import { getErrorMessage } from '@/utils/errors';

export default function MealResultScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const imageUri = useScanDraftStore((s) => s.imageUri);
  const items = useScanDraftStore((s) => s.items);
  const setItems = useScanDraftStore((s) => s.setItems);
  const reset = useScanDraftStore((s) => s.reset);
  const isPublishing = useScanDraftStore((s) => s.isPublishing);
  const setPublishing = useScanDraftStore((s) => s.setPublishing);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const totals = useMemo(() => sumTotals(items), [items]);

  const publish = useMutation({
    mutationFn: async () => {
      if (!user || !imageUri) throw new Error('No hay imagen o sesión');
      if (items.length === 0) throw new Error('Agregá al menos un alimento');
      setPublishing(true);
      const imageUrl = await uploadMealImage(user.id, imageUri);
      return createMeal({
        userId: user.id,
        imageUrl,
        items,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed(user?.id) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.todayTotals(user?.id) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.weekTotals(user?.id) }),
      ]);
      reset();
      router.replace('/(tabs)');
    },
    onError: (err) => {
      setPublishing(false);
      Alert.alert('No se pudo registrar', getErrorMessage(err));
    },
  });

  if (!imageUri) {
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
            <Text style={styles.title}>Detectamos</Text>
            <View style={{ width: 28 }} />
          </View>

          <Image source={{ uri: imageUri }} style={styles.image} contentFit="cover" />
          <Text style={styles.estimate}>Estimación · podés corregir antes de publicar</Text>

          <View style={styles.list}>
            {items.map((item) => (
              <View key={item.localId} style={styles.item}>
                <TextInput
                  style={styles.itemName}
                  value={item.name}
                  onChangeText={(name) =>
                    setItems(items.map((i) => (i.localId === item.localId ? { ...i, name, source: 'edited' } : i)))
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
                        setItems(
                          items.map((i) =>
                            i.localId === item.localId ? recalculateItem(i, grams) : i,
                          ),
                        );
                      }}
                    />
                    <Text style={styles.gramsUnit}>g</Text>
                  </View>
                  <Text style={styles.itemMacros}>
                    ≈ {Math.round(item.calories)} kcal · {Math.round(item.protein)}g prot
                  </Text>
                  <Pressable
                    onPress={() => setItems(items.filter((i) => i.localId !== item.localId))}
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
            onPress={() => publish.mutate()}
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
  empty: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { ...typography.h2, color: colors.text },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  estimate: { ...typography.caption, color: colors.textSecondary },
  list: { gap: spacing.md },
  item: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  itemName: {
    ...typography.bodyMedium,
    color: colors.text,
    padding: 0,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
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
  itemMacros: { ...typography.caption, color: colors.textSecondary, flex: 1 },
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  totalItem: {
    width: '48%',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  totalLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    letterSpacing: 0.5,
  },
  totalValue: { ...typography.h3, color: colors.text, marginTop: 4 },
});
