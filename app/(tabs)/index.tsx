import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionSheet } from '@/components/ui/ActionSheet';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { QUERY_KEYS } from '@/constants';
import { MealCard } from '@/features/feed/MealCard';
import { calculateJointStreak, calculatePersonalStreak } from '@/features/streaks/calculateStreaks';
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
import { dailyGuidance } from '@/features/coaching/coach';
import { useSubscription } from '@/hooks/useSubscription';
import { getGreeting } from '@/utils/nutrition';

export default function HomeScreen() {
  const { user, profile, partner, goals, refreshBootstrap } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const [sheetOpen, setSheetOpen] = useState(false);
  const access = useSubscription();

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
    () => calculatePersonalStreak((myMealsSince.data ?? []).map((m) => ({ eatenAt: m.eaten_at }))),
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
      queryClient.setQueryData(QUERY_KEYS.waterToday(userId), ctx?.prev ?? 0);
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
  const todayMealCount = (myMealsSince.data ?? []).filter((m) => {
    if (m.user_id !== userId) return false;
    const d = new Date(m.eaten_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const guidance = dailyGuidance(
    (myMealsSince.data ?? []).map((m) => ({
      eatenAt: m.eaten_at,
      protein: Number(m.total_protein),
      calories: Number(m.total_calories),
    })),
    goals?.protein_target ?? 140,
  );
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
                <Avatar name={profile?.display_name ?? 'U'} uri={profile?.avatar_url} size={48} />
                <View>
                  <Text style={styles.greeting}>{getGreeting()}</Text>
                  <Text numberOfLines={1} style={styles.name}>
                    {profile?.display_name?.split(' ')[0] ?? 'Hola'}
                  </Text>
                </View>
              </View>
              <View style={styles.streaks}>
                <Text style={styles.streakChip}>🔥 {personalStreak}d</Text>
                {partner ? <Text style={styles.streakChip}>❤️ {jointStreak}d</Text> : null}
              </View>
            </View>

            <View style={styles.dashboard}>
              <View style={styles.dashboardTop}>
                <Text style={styles.dashboardLabel}>TU DÍA, A TU RITMO</Text>
                <Text style={styles.dashboardLabel}>{todayMealCount} comidas</Text>
              </View>
              <Text style={styles.dashboardValue}>
                {totalsQuery.isError ? '—' : `≈ ${Math.round(totals.calories)}`}{' '}
                <Text style={styles.dashboardUnit}>kcal registradas</Text>
              </Text>
              <Text style={styles.dashboardNote}>
                {goals
                  ? `Referencia personal: ${goals.calories_target} kcal · valores estimados`
                  : 'Cada registro te ayuda a conocer tus hábitos'}
              </Text>
              <View style={styles.dashboardTop}>
                {[
                  ['Proteína', totals.protein, goals?.protein_target],
                  ['Carbos', totals.carbs, goals?.carbs_target],
                  ['Grasas', totals.fat, goals?.fat_target],
                ].map(([label, value, target]) => (
                  <View key={String(label)} style={styles.macro}>
                    <Text style={styles.dashboardLabel}>{label}</Text>
                    <Text style={styles.macroValue}>{Math.round(Number(value))} g</Text>
                    <View style={styles.track}>
                      <View
                        style={[
                          styles.fill,
                          {
                            width: `${Math.min(100, Math.max(0, (Number(value) / Math.max(1, Number(target) || 1)) * 100))}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.quickRow}>
              <Button title="Registrar comida" onPress={() => setSheetOpen(true)} />
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/meal/repeat')}
                style={styles.repeat}
              >
                <Text style={styles.waterBtnText}>Repetir →</Text>
              </Pressable>
            </View>
            <View style={styles.waterCard}>
              <View style={styles.waterHeader}>
                <Text style={styles.waterTitle}>Agua</Text>
                <Text style={styles.waterValue}>
                  {waterMl.toLocaleString('es-UY')} / {waterGoal.toLocaleString('es-UY')} ml
                </Text>
              </View>
              <View style={styles.waterActions}>
                {[250, 500].map((ml) => (
                  <Pressable
                    key={ml}
                    accessibilityRole="button"
                    accessibilityLabel={`Sumar ${ml} ml`}
                    disabled={waterMutation.isPending}
                    style={styles.waterBtn}
                    onPress={() => waterMutation.mutate(ml)}
                  >
                    <Text style={styles.waterBtnText}>+{ml} ml</Text>
                  </Pressable>
                ))}
              </View>
              {waterMutation.isError && (
                <Text style={styles.simpleDetail}>No pudimos guardar el agua. Probá de nuevo.</Text>
              )}
            </View>
            <Pressable style={styles.simpleCard} onPress={() => router.push('/coach')}>
              <Text style={styles.coachLabel}>TU PRÓXIMO PASO</Text>
              <Text style={styles.simpleTitle}>{guidance.title}</Text>
              <Text style={styles.simpleDetail}>{guidance.detail}</Text>
              <Text style={styles.waterBtnText}>Ver ideas para comer →</Text>
            </Pressable>
            <Pressable
              style={styles.partnerCard}
              onPress={() => router.push(partner ? `/partner/${partner.id}` : '/partner/invite')}
            >
              <View style={styles.partnerRow}>
                <Avatar name={partner?.display_name ?? 'R'} uri={partner?.avatar_url} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.partnerName}>
                    {partner
                      ? `Vos y ${partner.display_name.split(' ')[0]}`
                      : 'Una racha se comparte'}
                  </Text>
                  <Text style={styles.partnerMeta}>
                    {partner
                      ? `${jointStreak} días juntos · tu compañero lleva ${partnerStreak} días${partnerTotalsQuery.data ? ` · ≈ ${Math.round(partnerTotalsQuery.data.calories)} kcal registradas` : ''}`
                      : 'Invitá a alguien y acompañense cada día'}
                  </Text>
                </View>
                <Text style={styles.waterBtnText}>→</Text>
              </View>
            </Pressable>
            <Pressable onPress={() => router.push('/subscription')}>
              <Text style={styles.simpleMeta}>
                {access.data
                  ? `${access.data.plan.toUpperCase()} · ${access.data.remaining} análisis disponibles →`
                  : 'Conocé Racha Plus →'}
              </Text>
            </Pressable>
            {(sharedInvitesQuery.data?.length ?? 0) > 0 ? (
              <Pressable
                style={styles.sharedBanner}
                onPress={() => router.push(`/shared/${sharedInvitesQuery.data![0]!.id}`)}
              >
                <Text style={styles.sharedText}>
                  Tenés {sharedInvitesQuery.data!.length} comida
                  {sharedInvitesQuery.data!.length === 1 ? '' : 's'} compartida
                  {sharedInvitesQuery.data!.length === 1 ? '' : 's'} pendiente
                  {sharedInvitesQuery.data!.length === 1 ? '' : 's'}
                </Text>
              </Pressable>
            ) : null}

            <Text style={styles.sectionTitle}>Tus últimas comidas</Text>
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
            key: 'text',
            label: 'Escribir qué comí',
            icon: 'chatbubble-outline',
            onPress: () => router.push('/meal/text'),
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
  dashboard: { backgroundColor: colors.primary, borderRadius: 22, padding: 20, gap: 12 },
  dashboardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 14 },
  dashboardLabel: { ...typography.caption, color: '#D3E4D7' },
  dashboardValue: { ...typography.brand, color: colors.white },
  dashboardUnit: { ...typography.caption, color: '#D3E4D7' },
  dashboardNote: { ...typography.caption, color: '#D3E4D7' },
  macro: { flex: 1, gap: 5 },
  macroValue: { ...typography.bodyMedium, color: colors.white },
  track: { height: 4, borderRadius: 2, backgroundColor: '#526F5A', overflow: 'hidden' },
  fill: { height: 4, backgroundColor: colors.accent },
  quickRow: { gap: 6 },
  repeat: { alignSelf: 'center', minHeight: 44, justifyContent: 'center' },
  coachLabel: { ...typography.label, fontSize: 10, letterSpacing: 1.5, color: colors.primary },
  rachaHero: {
    backgroundColor: '#172A22',
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  rachaEyebrow: { ...typography.label, color: '#C8F56C', letterSpacing: 1 },
  rachaNumber: { ...typography.brand, fontSize: 36, lineHeight: 44, color: '#FFFFFF' },
  rachaSubtitle: { ...typography.body, color: '#D7E7D7' },
  rachaDuo: {
    backgroundColor: '#34513A',
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  rachaDuoText: { ...typography.label, color: '#E6F7CF' },
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: spacing.xxxl, gap: spacing.lg },
  headerBlock: { gap: 12, marginBottom: spacing.md },
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
