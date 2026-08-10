import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
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
import { MEAL_TYPE_LABELS, QUERY_KEYS, REACTION_OPTIONS } from '@/constants';
import { applyMealPrivacy } from '@/features/privacy/privacy';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';
import {
  addComment,
  deleteComment,
  deleteMeal,
  fetchMealById,
  mealItemsToEditable,
  removeReaction,
  upsertReaction,
} from '@/services/meals';
import { createSavedMeal } from '@/services/saved-meals';
import { createSharedMealInvite } from '@/services/shared-meals';
import type { MealReactionType } from '@/types/database';
import { formatKcal } from '@/utils/nutrition';
import { getHumanErrorMessage } from '@/utils/errors';

function formatMealTime(iso: string): string {
  const date = new Date(iso);
  const time = format(date, 'HH:mm');
  if (isToday(date)) return `Hoy · ${time}`;
  if (isYesterday(date)) return `Ayer · ${time}`;
  return `${format(date, "d MMM", { locale: es })} · ${time}`;
}

export default function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, partner } = useAuth();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');
  const [savedName, setSavedName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  const mealQuery = useQuery({
    queryKey: QUERY_KEYS.meal(id),
    queryFn: () => fetchMealById(id!),
    enabled: Boolean(id),
  });

  const mealData = mealQuery.data;
  const isOwner = Boolean(user && mealData && mealData.user_id === user.id);
  const privacy = mealData && user ? applyMealPrivacy(mealData, user.id) : null;
  const meal = privacy?.meal ?? mealData;
  const hideCalories = privacy?.hideCalories ?? false;
  const hideMacros = privacy?.hideMacros ?? false;

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.meal(id) }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed(user?.id) }),
    ]);
  };

  const reactMutation = useMutation({
    mutationFn: async (reaction: MealReactionType) => {
      if (!user || !id) throw new Error('No hay sesión');
      const existing = mealData?.meal_reactions.find((r) => r.user_id === user.id);
      if (existing?.reaction === reaction) {
        await removeReaction(id, user.id);
      } else {
        await upsertReaction({ mealId: id, userId: user.id, reaction });
      }
    },
    onSuccess: invalidate,
    onError: (err) => Alert.alert('No se pudo reaccionar', getHumanErrorMessage(err)),
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error('No hay sesión');
      const body = commentText.trim();
      if (!body) throw new Error('Escribí un comentario');
      return addComment({ mealId: id, userId: user.id, body });
    },
    onSuccess: async () => {
      setCommentText('');
      await invalidate();
    },
    onError: (err) => Alert.alert('No se pudo comentar', getHumanErrorMessage(err)),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => {
      if (!user) throw new Error('No hay sesión');
      return deleteComment(commentId, user.id);
    },
    onSuccess: invalidate,
    onError: (err) => Alert.alert('No se pudo borrar', getHumanErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error('No hay sesión');
      await deleteMeal(id, user.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed(user?.id) });
      router.replace('/(tabs)');
    },
    onError: (err) => Alert.alert('No se pudo eliminar', getHumanErrorMessage(err)),
  });

  const saveFrequentMutation = useMutation({
    mutationFn: async () => {
      if (!user || !mealData) throw new Error('No hay comida');
      const name = savedName.trim() || `${MEAL_TYPE_LABELS[mealData.meal_type]} favorita`;
      return createSavedMeal({
        userId: user.id,
        name,
        mealType: mealData.meal_type,
        imageUrl: mealData.image_url,
        items: mealItemsToEditable(mealData.meal_items),
      });
    },
    onSuccess: async () => {
      setShowSaveForm(false);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.savedMeals(user?.id) });
      Alert.alert('Guardada', 'La comida quedó en tus favoritas.');
    },
    onError: (err) => Alert.alert('No se pudo guardar', getHumanErrorMessage(err)),
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      if (!user || !partner || !id) throw new Error('No hay partner');
      return createSharedMealInvite({
        sourceMealId: id,
        senderId: user.id,
        recipientId: partner.id,
      });
    },
    onSuccess: () => Alert.alert('Enviada', `Compartiste la comida con ${partner?.display_name}.`),
    onError: (err) => Alert.alert('No se pudo compartir', getHumanErrorMessage(err)),
  });

  const confirmDelete = () => {
    Alert.alert('Eliminar comida', '¿Seguro que querés borrarla?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ]);
  };

  if (mealQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (mealQuery.isError || !meal) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState
          message={getHumanErrorMessage(mealQuery.error, 'No encontramos esa comida.')}
          onRetry={() => mealQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  const myReaction = meal.meal_reactions.find((r) => r.user_id === user?.id)?.reaction;
  const comments = meal.meal_comments ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Comida</Text>
          <View style={{ width: 28 }} />
        </View>

        {meal.image_url ? (
          <Image source={{ uri: meal.image_url }} style={styles.image} contentFit="cover" />
        ) : null}

        <View style={styles.authorRow}>
          <Avatar name={meal.profile.display_name} uri={meal.profile.avatar_url} size={44} />
          <View style={styles.authorText}>
            <Text style={styles.authorName}>{meal.profile.display_name}</Text>
            <Text style={styles.authorMeta}>
              {MEAL_TYPE_LABELS[meal.meal_type]} · {formatMealTime(meal.eaten_at)}
            </Text>
          </View>
        </View>

        <View style={styles.macros}>
          {!hideCalories ? (
            <MacroChip label="kcal" value={`≈ ${Math.round(meal.total_calories)}`} />
          ) : (
            <MacroChip label="kcal" value="—" />
          )}
          {!hideMacros ? (
            <>
              <MacroChip label="prot" value={`${Math.round(meal.total_protein)}g`} />
              <MacroChip label="carb" value={`${Math.round(meal.total_carbs)}g`} />
              <MacroChip label="grasa" value={`${Math.round(meal.total_fat)}g`} />
            </>
          ) : (
            <>
              <MacroChip label="prot" value="—" />
              <MacroChip label="carb" value="—" />
              <MacroChip label="grasa" value="—" />
            </>
          )}
        </View>

        {!hideCalories ? (
          <Text style={styles.kcalLine}>{formatKcal(meal.total_calories)}</Text>
        ) : (
          <Text style={styles.privateNote}>Las calorías están ocultas por privacidad.</Text>
        )}

        <Text style={styles.sectionTitle}>Alimentos</Text>
        <View style={styles.items}>
          {meal.meal_items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.food_name}</Text>
              <Text style={styles.itemMeta}>
                {Math.round(Number(item.grams))} g
                {!hideMacros
                  ? ` · ${Math.round(Number(item.calories))} kcal`
                  : ''}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Reacciones</Text>
        <View style={styles.reactions}>
          {REACTION_OPTIONS.map((option) => {
            const count = meal.meal_reactions.filter((r) => r.reaction === option.value).length;
            const selected = myReaction === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => reactMutation.mutate(option.value)}
                style={[styles.reactionBtn, selected && styles.reactionSelected]}
              >
                <Text style={styles.reactionEmoji}>{option.emoji}</Text>
                {count > 0 ? <Text style={styles.reactionCount}>{count}</Text> : null}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Comentarios ({comments.length})</Text>
        <View style={styles.comments}>
          {comments.map((comment) => (
            <View key={comment.id} style={styles.comment}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentAuthor}>
                  {comment.profile?.display_name ?? 'Usuario'}
                </Text>
                {comment.user_id === user?.id ? (
                  <Pressable onPress={() => deleteCommentMutation.mutate(comment.id)}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.commentBody}>{comment.body}</Text>
            </View>
          ))}
        </View>

        <View style={styles.commentForm}>
          <TextInput
            style={styles.commentInput}
            placeholder="Escribí un comentario…"
            placeholderTextColor={colors.textTertiary}
            value={commentText}
            onChangeText={setCommentText}
          />
          <Button
            title="Enviar"
            variant="secondary"
            loading={commentMutation.isPending}
            onPress={() => commentMutation.mutate()}
          />
        </View>

        {isOwner ? (
          <View style={styles.ownerActions}>
            <Button
              title="Editar"
              variant="secondary"
              onPress={() => router.push(`/meal/edit/${meal.id}`)}
            />
            {partner ? (
              <Button
                title={`Compartir con ${partner.display_name}`}
                variant="secondary"
                loading={shareMutation.isPending}
                onPress={() => shareMutation.mutate()}
              />
            ) : null}
            {showSaveForm ? (
              <View style={styles.saveForm}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Nombre (opcional)"
                  placeholderTextColor={colors.textTertiary}
                  value={savedName}
                  onChangeText={setSavedName}
                />
                <Button
                  title="Confirmar favorita"
                  loading={saveFrequentMutation.isPending}
                  onPress={() => saveFrequentMutation.mutate()}
                />
              </View>
            ) : (
              <Button
                title="Guardar como frecuente"
                variant="secondary"
                onPress={() => setShowSaveForm(true)}
              />
            )}
            <Button
              title="Eliminar"
              variant="danger"
              loading={deleteMutation.isPending}
              onPress={confirmDelete}
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function MacroChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipValue}>{value}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
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
  headerTitle: { ...typography.h2, color: colors.text },
  image: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  authorText: { flex: 1 },
  authorName: { ...typography.bodyMedium, color: colors.text },
  authorMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  macros: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  chipValue: { ...typography.label, color: colors.text },
  chipLabel: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
  kcalLine: { ...typography.bodyMedium, color: colors.textSecondary },
  privateNote: { ...typography.caption, color: colors.textTertiary, fontStyle: 'italic' },
  sectionTitle: { ...typography.h3, color: colors.text },
  items: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  itemRow: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 2,
  },
  itemName: { ...typography.bodyMedium, color: colors.text },
  itemMeta: { ...typography.caption, color: colors.textSecondary },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reactionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  reactionEmoji: { fontSize: 16 },
  reactionCount: { ...typography.caption, color: colors.textSecondary },
  comments: { gap: spacing.sm },
  comment: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commentAuthor: { ...typography.label, color: colors.text },
  commentBody: { ...typography.body, color: colors.textSecondary },
  commentForm: { gap: spacing.sm },
  commentInput: {
    ...typography.body,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  ownerActions: { gap: spacing.sm, marginTop: spacing.md },
  saveForm: { gap: spacing.sm },
});
