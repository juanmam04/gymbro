import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/lib/theme';

interface NutritionSummaryProps {
  consumed: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export function NutritionSummary({ consumed, targets }: NutritionSummaryProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tu objetivo de hoy</Text>
      <View style={styles.row}>
        <Metric label="calorías" value={Math.round(consumed.calories)} target={targets.calories} />
        <Metric
          label="proteína"
          value={Math.round(consumed.protein)}
          target={targets.protein}
          unit="g"
        />
      </View>
      <View style={styles.row}>
        <Metric
          label="carbos"
          value={Math.round(consumed.carbs)}
          target={targets.carbs}
          unit="g"
        />
        <Metric
          label="grasas"
          value={Math.round(consumed.fat)}
          target={targets.fat}
          unit="g"
        />
      </View>
    </View>
  );
}

function Metric({
  label,
  value,
  target,
  unit = '',
}: {
  label: string;
  value: number;
  target: number;
  unit?: string;
}) {
  const progress = target > 0 ? Math.min(value / target, 1) : 0;

  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>
        {value}
        <Text style={styles.metricTarget}>
          {' '}
          / {target}
          {unit ? ` ${unit}` : ''}
        </Text>
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    ...typography.label,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metric: {
    flex: 1,
    gap: 4,
  },
  metricValue: {
    ...typography.h3,
    color: colors.text,
  },
  metricTarget: {
    ...typography.caption,
    color: colors.textTertiary,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  barTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceMuted,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
});
