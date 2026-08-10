import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { MEAL_TYPE_LABELS, QUERY_KEYS } from '@/constants';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { mealItemsToEditable } from '@/services/meals';
import {
  acceptSharedMealEdited,
  acceptSharedMealSamePortion,
  declineSharedMealInvite,
} from '@/services/shared-meals';
import type { SharedMealInvite } from '@/types/database';
import type { EditableFoodItem } from '@/types/nutrition';
import { createLocalId, recalculateItem, sumTotals } from '@/utils/nutrition';
import { getHumanErrorMessage } from '@/utils/errors';

async function fetchSharedInvite(inviteId: string, userId: string): Promise<SharedMealInvite | null> {
  const { data, error } = await supabase
    .from('shared_meal_invites')
    .select(
      `
      *,
      source_meal:meals!shared_meal_invites_source_meal_id_fkey (*, meal_items (*)),
      sender:profiles!shared_meal_invites_sender_id_fkey (id, display_name, avatar_url)
    `,
    )
    .eq('id', inviteId)
    .eq('recipient_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as SharedMealInvite | null;
}

export default function SharedMealInviteScreen() {
  const { inviteId } = useLocalSearchParams<{ inviteId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'choose' | 'edit'>('choose');
  const [items, setItems] = useState<EditableFoodItem[]>([]);

  const inviteQuery = useQuery({
    queryKey: ['sharedInvite', inviteId, user?.id],
    queryFn: () => fetchSharedInvite(inviteId!, user!.id),
    enabled: Boolean(inviteId && user?.id),
  });

  const invite = inviteQuery.data;
  const sourceMeal = invite?.source_meal as
    | (SharedMealInvite['source_meal'] & { meal_items?: Parameters<typeof mealItemsToEditable>[0] })
    | undefined;

  useEffect(() => {
    if (!sourceMeal?.meal_items) return;
    setItems(
      mealItemsToEditable(sourceMeal.meal_items).map((item) => ({
        ...item,
        localId: createLocalId(),
      })),
    );
  }, [sourceMeal]);

  const totals = useMemo(() => sumTotals(items), [items]);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed(user?.id) }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sharedInvites(user?.id) }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.todayTotals(user?.id) }),
    ]);
  };

  const acceptSame = useMutation({
    mutationFn: () => {
      if (!user || !inviteId) throw new Error('Invitación no válida');
      return acceptSharedMealSamePortion({ inviteId, userId: user.id });
    },
    onSuccess: async (mealId) => {
      await invalidate();
      router.replace(`/meal/${mealId}`);
    },
    onError: (err) => Alert.alert('No se pudo aceptar', getHumanErrorMessage(err)),
  });

  const acceptEdited = useMutation({
    mutationFn: () => {
      if (!user || !inviteId) throw new Error('Invitación no válida');
      if (items.length === 0) throw new Error('Agregá al menos un alimento');
      return acceptSharedMealEdited({
        inviteId,
        userId: user.id,
        items,
        mealType: sourceMeal?.meal_type,
      });
    },
    onSuccess: async (mealId) => {
      await invalidate();
      router.replace(`/meal/${mealId}`);
    },
    onError: (err) => Alert.alert('No se pudo guardar', getHumanErrorMessage(err)),
  });

  const decline = useMutation({
    mutationFn: () => {
      if (!user || !inviteId) throw new Error('Invitación no válida');
      return declineSharedMealInvite(inviteId, user.id);
    },
    onSuccess: async () => {
      await invalidate();
      router.replace('/(tabs)');
    },
    onError: (err) => Alert.alert('No se pudo rechazar', getHumanErrorMessage(err)),
  });

  if (inviteQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <LoadingState message="Cargando invitación…" />
      </SafeAreaView>
    );
  }

  if (inviteQuery.isError || !invite || !sourceMeal) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState
          message={getHumanErrorMessage(inviteQuery.error, 'Esta invitación ya no está disponible.')}
          onRetry={() => inviteQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  if (invite.status !== 'pending') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.title}>Invitación {invite.status === 'accepted' ? 'aceptada' : 'rechazada'}</Text>
          <Button title="Volver al inicio" onPress={() => router.replace('/(tabs)')} />
        </View>
      </SafeAreaView>
    );
  }

  if (mode === 'edit') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Pressable onPress={() => setMode('choose')}>
              <Ionicons name="chevron-back" size={28} color={colors.text} />
            </Pressable>
            <Text style={styles.title}>Ajustar porciones</Text>
            <View style={{ width: 28 }} />
          </View>

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
                  <Text style={styles.itemMeta}>{Math.round(item.calories)} kcal</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.totals}>
            Total: {Math.round(totals.calories)} kcal · P {Math.round(totals.protein)}g
          </Text>

          <Button
            title="Registrar con mis porciones"
            loading={acceptEdited.isPending}
            onPress={() => acceptEdited.mutate()}
          />
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
          <Text style={styles.title}>Comida compartida</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.senderRow}>
          <Avatar
            name={invite.sender?.display_name ?? 'GymBro'}
            uri={invite.sender?.avatar_url ?? null}
            size={48}
          />
          <View style={styles.senderText}>
            <Text style={styles.senderName}>{invite.sender?.display_name ?? 'Tu GymBro'}</Text>
            <Text style={styles.senderMeta}>te compartió una comida</Text>
          </View>
        </View>

        {sourceMeal.image_url ? (
          <Image source={{ uri: sourceMeal.image_url }} style={styles.image} contentFit="cover" />
        ) : null}

        <Text style={styles.mealType}>{MEAL_TYPE_LABELS[sourceMeal.meal_type]}</Text>
        <Text style={styles.mealMeta}>
          {Math.round(Number(sourceMeal.total_calories))} kcal ·{' '}
          {sourceMeal.meal_items?.map((i) => i.food_name).slice(0, 3).join(' · ')}
        </Text>

        <View style={styles.actions}>
          <Button
            title="Misma porción"
            loading={acceptSame.isPending}
            onPress={() => acceptSame.mutate()}
          />
          <Button title="Editar porciones" variant="secondary" onPress={() => setMode('edit')} />
          <Button
            title="Rechazar"
            variant="ghost"
            loading={decline.isPending}
            onPress={() => decline.mutate()}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  centered: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { ...typography.h2, color: colors.text },
  senderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  senderText: { flex: 1 },
  senderName: { ...typography.bodyMedium, color: colors.text },
  senderMeta: { ...typography.caption, color: colors.textSecondary },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  mealType: { ...typography.h3, color: colors.text },
  mealMeta: { ...typography.body, color: colors.textSecondary },
  actions: { gap: spacing.sm, marginTop: spacing.md },
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
  totals: { ...typography.bodyMedium, color: colors.text },
});
