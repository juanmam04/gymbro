import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionSheet } from '@/components/ui/ActionSheet';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { QUERY_KEYS } from '@/constants';
import { MealCard } from '@/features/feed/MealCard';
import { NutritionSummary } from '@/features/feed/NutritionSummary';
import { getSimpleDayMessage } from '@/features/privacy/privacy';
import {
  calculateJointStreak,
  calculatePersonalStreak,
} from '@/features/streaks/calculateStreaks';
import { useFeedRealtime } from '@/hooks/useFeedRealtime';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';
import {
  fetchFeed,
  fetchMealsSince,
  fetchTodayTotals,
  removeReaction,
  upsertReaction,
} from '@/services/meals';
import { fetchPendingSharedInvites } from '@/services/shared-meals';
import { addWaterEntry, fetchTodayWaterMl } from '@/services/water';
import type { MealReactionType } from '@/types/database';
import { getErrorMessage } from '@/utils/errors';
import { getGreeting } from '@/utils/nutrition';

export default function HomeScreen() {
  const { user, profile, partner, goals, refreshBootstrap } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const [sheetOpen, setSheetOpen] = useState(false);
  const displayMode = profile?.nutrition_display_mode ?? 'simple';

  const feedUserIds = useMemo(() => {
    const ids = [userId].filter(Boolean) as string[];
    if (partner?.id) ids.push(partner.id);
    return ids;
  }, [userId, partner]);

  useFeedRealtime(feedUserIds);

  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 60);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const feedQuery = useQuery({
    queryKey: QUERY_KEYS.feed(userId),
    queryFn: () => fetchFeed(feedUserIds),
    enabled: Boolean(userId),
  });

  const totalsQuery = useQuery({
    queryKey: QUERY_KEYS.todayTotals(userId),
    queryFn: () => fetchTodayTotals(userId!),
    enabled: Boolean(userId),
  });

  const partnerTotalsQuery = useQuery({
    queryKey: QUERY_KEYS.todayTotals(partner?.id),
    queryFn: () => fetchTodayTotals(partner!.id),
    enabled: Boolean(partner?.id) && (partner?.share_goals ?? true),
  });

  const waterQuery = useQuery({
    queryKey: QUERY_KEYS.waterToday(userId),
    queryFn: () => fetchTodayWaterMl(userId!),
    enabled: Boolean(userId),
  });

  const myMealsSince = useQuery({
    queryKey: QUERY_KEYS.mealsSince(userId),
    queryFn: () => fetchMealsSince(userId!, since),
    enabled: Boolean(userId),
  });

  const partnerMealsSince = useQuery({
    queryKey: QUERY_KEYS.mealsSince(partner?.id),
    queryFn: () => fetchMealsSince(partner!.id, since),
    enabled: Boolean(partner?.id),
  });

  const sharedInvitesQuery = useQuery({
    queryKey: QUERY_KEYS.sharedInvites(userId),
    queryFn: () => fetchPendingSharedInvites(userId!),
    enabled: Boolean(userId),
  });

  const personalStreak = useMemo(
    () =>
      calculatePersonalStreak(
        (myMealsSince.data ?? []).map((m) => ({ eatenAt: m.eaten_at })),
      ),
    [myMealsSince.data],
  );

  const partnerStreak = useMemo(
    () =>
      partner
        ? calculatePersonalStreak(
            (partnerMealsSince.data ?? []).map((m) => ({ eatenAt: m.eaten_at })),
          )
        : 0,
    [partner, partnerMealsSince.data],
  );

  const jointStreak = useMemo(
    () =>
      partner
        ? calculateJointStreak(
            (myMealsSince.data ?? []).map((m) => ({ eatenAt: m.eaten_at })),
            (partnerMealsSince.data ?? []).map((m) => ({ eatenAt: m.eaten_at })),
          )
        : 0,
    [partner, myMealsSince.data, partnerMealsSince.data],
  );

  const waterMutation = useMutation({
    mutationFn: (ml: number) => addWaterEntry(userId!, ml),
    onMutate: async (ml) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.waterToday(userId) });
      const prev = queryClient.getQueryData<number>(QUERY_KEYS.waterToday(userId));
      queryClient.setQueryData(QUERY_KEYS.waterToday(userId), (prev ?? 0) + ml);
      return { prev };
    },
    onError: (_e, _ml, ctx) => {
      if (ctx?.prev != null) {
        queryClient.setQueryData(QUERY_KEYS.waterToday(userId), ctx.prev);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.waterToday(userId) });
    },
  });

  const reactionMutation = useMutation({
    mutationFn: async ({
      mealId,
      reaction,
      current,
    }: {
      mealId: string;
      reaction: MealReactionType;
      current?: MealReactionType;
    }) => {
      if (!userId) return;
      if (current === reaction) await removeReaction(mealId, userId);
      else await upsertReaction({ mealId, userId, reaction });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed(userId) });
    },
  });

  const totals = totalsQuery.data ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const meals = feedQuery.data ?? [];
  const todayMealCount = meals.filter((m) => {
    if (m.user_id !== userId) return false;
    const d = new Date(m.eaten_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const simpleMessage = getSimpleDayMessage({
    consumedCalories: totals.calories,
    targetCalories: goals?.calories_target ?? 2200,
    consumedProtein: totals.protein,
    targetProtein: goals?.protein_target ?? 140,
    mealCount: todayMealCount,
  });

  const waterMl = waterQuery.data ?? 0;
  const waterGoal = profile?.water_goal_ml ?? 2500;

  if (feedQuery.isLoading || totalsQuery.isLoading) {
    return <LoadingState message="Cargando…" />;
  }

  if (feedQuery.isError) {
    return (
      <ErrorState message={getErrorMessage(feedQuery.error)} onRetry={() => feedQuery.refetch()} />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={meals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={feedQuery.isRefetching}
            onRefresh={() => {
              feedQuery.refetch();
              totalsQuery.refetch();
              waterQuery.refetch();
              sharedInvitesQuery.refetch();
              void refreshBootstrap();
            }}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Avatar
                  name={profile?.display_name ?? 'U'}
                  uri={profile?.avatar_url}
                  size={48}
                />
                <View>
                  <Text style={styles.greeting}>{getGreeting()}</Text>
                  <Text style={styles.name}>{profile?.display_name ?? 'Hola'}</Text>
                </View>
              </View>
              <View style={styles.streaks}>
                <Text style={styles.streakChip}>🔥 {personalStreak}d</Text>
                {partner ? <Text style={styles.streakChip}>❤️ {jointStreak}d</Text> : null}
              </View>
            </View>

            {displayMode === 'detailed' && goals ? (
              <NutritionSummary
                consumed={totals}
                targets={{
                  calories: goals.calories_target,
                  protein: goals.protein_target,
                  carbs: goals.carbs_target,
                  fat: goals.fat_target,
                }}
              />
            ) : (
              <View style={styles.simpleCard}>
                <Text style={styles.simpleTitle}>{simpleMessage.title}</Text>
                <Text style={styles.simpleDetail}>{simpleMessage.detail}</Text>
                {goals ? (
                  <Text style={styles.simpleMeta}>
                    ≈ {Math.round(totals.calories)} / {goals.calories_target} kcal
                  </Text>
                ) : null}
              </View>
            )}

            <View style={styles.waterCard}>
              <View style={styles.waterHeader}>
                <Text style={styles.waterTitle}>Agua</Text>
                <Text style={styles.waterValue}>
                  {waterMl.toLocaleString('es-AR')} / {waterGoal.toLocaleString('es-AR')} ml
                </Text>
              </View>
              <View style={styles.waterActions}>
                <Pressable
                  accessibilityLabel="Sumar 250 ml"
                  style={styles.waterBtn}
                  onPress={() => waterMutation.mutate(250)}
                >
                  <Text style={styles.waterBtnText}>+250 ml</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Sumar 500 ml"
                  style={styles.waterBtn}
                  onPress={() => waterMutation.mutate(500)}
                >
                  <Text style={styles.waterBtnText}>+500 ml</Text>
                </Pressable>
              </View>
            </View>

            <Button title="Registrar comida" onPress={() => setSheetOpen(true)} />

            {!partner ? (
              <View style={styles.inviteCard}>
                <Text style={styles.inviteTitle}>RACHA es mejor con alguien.</Text>
                <Text style={styles.inviteBody}>
                  Compartí comidas, progreso y motivación con tu compañero.
                </Text>
                <Button title="Invitar a alguien" onPress={() => router.push('/partner/invite')} />
                <Button
                  title="Tengo un código"
                  variant="secondary"
                  onPress={() => router.push('/partner/join')}
                />
              </View>
            ) : (
              <Pressable
                style={styles.partnerCard}
                onPress={() => router.push(`/partner/${partner.id}`)}
              >
                <View style={styles.partnerRow}>
                  <Avatar name={partner.display_name} uri={partner.avatar_url} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.partnerName}>{partner.display_name} hoy</Text>
                    <Text style={styles.partnerMeta}>
                      🔥 {partnerStreak}d
                      {partnerTotalsQuery.data
                        ? ` · ≈ ${Math.round(partnerTotalsQuery.data.calories)} kcal`
                        : ''}
                    </Text>
                  </View>
                </View>
              </Pressable>
            )}

            {(sharedInvitesQuery.data?.length ?? 0) > 0 ? (
              <Pressable
                style={styles.sharedBanner}
                onPress={() =>
                  router.push(`/shared/${sharedInvitesQuery.data![0]!.id}`)
                }
              >
                <Text style={styles.sharedText}>
                  Tenés {sharedInvitesQuery.data!.length} comida
                  {sharedInvitesQuery.data!.length === 1 ? '' : 's'} compartida
                  {sharedInvitesQuery.data!.length === 1 ? '' : 's'} pendiente
                  {sharedInvitesQuery.data!.length === 1 ? '' : 's'}
                </Text>
              </Pressable>
            ) : null}

            <Text style={styles.sectionTitle}>Hoy</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="¿Qué comiste hoy?"
            description="Registrá tu primera comida sacándole una foto."
            actionLabel="Registrar comida"
            onAction={() => setSheetOpen(true)}
          />
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/meal/${item.id}`)}>
            <MealCard
              meal={item}
              currentUserId={userId!}
              onReact={(mealId, reaction) => {
                const current = item.meal_reactions.find((r) => r.user_id === userId)?.reaction;
                reactionMutation.mutate({ mealId, reaction, current });
              }}
            />
          </Pressable>
        )}
      />

      <ActionSheet
        visible={sheetOpen}
        title="Registrar comida"
        subtitle="Elegí cómo querés cargarla"
        onClose={() => setSheetOpen(false)}
        items={[
          {
            key: 'scan',
            label: 'Escanear comida',
            icon: 'camera-outline',
            onPress: () => router.push('/(tabs)/scan'),
          },
          {
            key: 'barcode',
            label: 'Escanear código',
            icon: 'barcode-outline',
            onPress: () => router.push('/meal/barcode'),
          },
          {
            key: 'search',
            label: 'Buscar alimento',
            icon: 'search-outline',
            onPress: () => router.push('/meal/search'),
          },
          {
            key: 'manual',
            label: 'Agregar manualmente',
            icon: 'create-outline',
            onPress: () => router.push('/meal/manual'),
          },
          {
            key: 'repeat',
            label: 'Repetir / mis comidas',
            icon: 'refresh-outline',
            onPress: () => router.push('/meal/repeat'),
          },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.lg },
  headerBlock: { gap: spacing.lg, marginBottom: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', flex: 1 },
  greeting: { ...typography.caption, color: colors.textSecondary },
  name: { ...typography.h2, color: colors.text },
  streaks: { gap: 6, alignItems: 'flex-end' },
  streakChip: {
    ...typography.label,
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
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
  simpleMeta: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.sm },
  waterCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  waterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  waterTitle: { ...typography.h3, color: colors.text },
  waterValue: { ...typography.label, color: colors.textSecondary },
  waterActions: { flexDirection: 'row', gap: spacing.sm },
  waterBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterBtnText: { ...typography.label, color: colors.primary },
  inviteCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  inviteTitle: { ...typography.h3, color: colors.text },
  inviteBody: { ...typography.body, color: colors.textSecondary },
  partnerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  partnerRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  partnerName: { ...typography.bodyMedium, color: colors.text },
  partnerMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  sharedBanner: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  sharedText: { ...typography.label, color: colors.primary },
  sectionTitle: { ...typography.h2, color: colors.text },
});
