import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Avatar } from '@/components/ui/Avatar';
import { MEAL_TYPE_LABELS, REACTION_OPTIONS } from '@/constants';
import { colors, radius, spacing, typography } from '@/lib/theme';
import type { MealReactionType, MealWithDetails } from '@/types/database';

interface MealCardProps {
  meal: MealWithDetails;
  currentUserId: string;
  onReact: (mealId: string, reaction: MealReactionType) => void;
}

function formatMealTime(iso: string): string {
  const date = new Date(iso);
  const time = format(date, 'HH:mm');
  if (isToday(date)) return `Hoy · ${time}`;
  if (isYesterday(date)) return `Ayer · ${time}`;
  return `${format(date, "d MMM", { locale: es })} · ${time}`;
}

export function MealCard({ meal, currentUserId, onReact }: MealCardProps) {
  const myReaction = meal.meal_reactions.find((r) => r.user_id === currentUserId)?.reaction;
  const topFoods = meal.meal_items.slice(0, 3).map((item) => item.food_name);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar name={meal.profile.display_name} uri={meal.profile.avatar_url} size={42} />
        <View style={styles.headerText}>
          <Text style={styles.name}>{meal.profile.display_name}</Text>
          <Text style={styles.meta}>
            {MEAL_TYPE_LABELS[meal.meal_type]} · {formatMealTime(meal.eaten_at)}
          </Text>
        </View>
      </View>

      {meal.image_url ? (
        <Image source={{ uri: meal.image_url }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.placeholderText}>Sin foto</Text>
        </View>
      )}

      <View style={styles.macros}>
        <MacroChip label="kcal" value={`≈ ${Math.round(meal.total_calories)}`} />
        <MacroChip label="prot" value={`${Math.round(meal.total_protein)}g`} />
        <MacroChip label="carb" value={`${Math.round(meal.total_carbs)}g`} />
        <MacroChip label="grasa" value={`${Math.round(meal.total_fat)}g`} />
      </View>

      {topFoods.length > 0 ? (
        <Text style={styles.foods}>{topFoods.join(' · ')}</Text>
      ) : null}

      <Text style={styles.estimateNote}>Estimación nutricional</Text>

      <View style={styles.reactions}>
        {REACTION_OPTIONS.map((option) => {
          const count = meal.meal_reactions.filter((r) => r.reaction === option.value).length;
          const selected = myReaction === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onReact(meal.id, option.value)}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              style={[styles.reactionBtn, selected && styles.reactionSelected]}
            >
              <Text style={styles.reactionEmoji}>{option.emoji}</Text>
              {count > 0 ? <Text style={styles.reactionCount}>{count}</Text> : null}
            </Pressable>
          );
        })}
        {(meal.comments_count ?? meal.meal_comments?.length ?? 0) > 0 ? (
          <Text style={styles.commentCount}>
            💬 {meal.comments_count ?? meal.meal_comments?.length}
          </Text>
        ) : null}
      </View>
    </View>
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
  card: {
    marginBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  name: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    ...typography.body,
    color: colors.textTertiary,
  },
  macros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  chip: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  chipValue: {
    ...typography.label,
    color: colors.text,
  },
  chipLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  foods: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  estimateNote: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  reactions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
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
    minHeight: 44,
  },
  reactionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  reactionEmoji: {
    fontSize: 16,
  },
  reactionCount: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  commentCount: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
});
