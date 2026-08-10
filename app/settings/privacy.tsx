import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { QUERY_KEYS } from '@/constants';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';
import { updateProfile } from '@/services/auth';
import type { PrivacyFlags } from '@/types/database';
import { getHumanErrorMessage } from '@/utils/errors';

type PrivacyKey = keyof PrivacyFlags;

const OPTIONS: { key: PrivacyKey; title: string; description: string }[] = [
  {
    key: 'share_meals',
    title: 'Compartir comidas',
    description: 'Tu partner puede ver qué registraste.',
  },
  {
    key: 'share_calories',
    title: 'Compartir calorías',
    description: 'Mostrar kcal totales en el feed.',
  },
  {
    key: 'share_macros',
    title: 'Compartir macros',
    description: 'Mostrar proteína, carbos y grasas.',
  },
  {
    key: 'share_goals',
    title: 'Compartir objetivos',
    description: 'Dejar ver tu progreso vs. metas diarias.',
  },
  {
    key: 'share_weight',
    title: 'Compartir peso',
    description: 'Incluir tu peso en el perfil compartido.',
  },
];

export default function PrivacySettingsScreen() {
  const { user, profile, refreshBootstrap } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (patch: Partial<PrivacyFlags>) => {
      if (!user) throw new Error('No hay sesión');
      return updateProfile(user.id, patch);
    },
    onSuccess: async () => {
      await Promise.all([
        refreshBootstrap(),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile(user?.id) }),
      ]);
    },
    onError: (err) => Alert.alert('No se pudo guardar', getHumanErrorMessage(err)),
  });

  const toggle = (key: PrivacyKey, value: boolean) => {
    mutation.mutate({ [key]: value });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Privacidad</Text>
          <View style={{ width: 28 }} />
        </View>

        <Text style={styles.intro}>
          Elegí qué compartís con tu GymBro. Siempre podés cambiarlo.
        </Text>

        <View style={styles.list}>
          {OPTIONS.map((option) => (
            <View key={option.key} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{option.title}</Text>
                <Text style={styles.rowDescription}>{option.description}</Text>
              </View>
              <Switch
                value={profile?.[option.key] ?? true}
                onValueChange={(value) => toggle(option.key, value)}
                trackColor={{ false: colors.border, true: colors.primarySoft }}
                thumbColor={profile?.[option.key] ? colors.primary : colors.surface}
                disabled={mutation.isPending}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
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
  title: { ...typography.h2, color: colors.text },
  intro: { ...typography.body, color: colors.textSecondary },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowText: { flex: 1, gap: 4 },
  rowTitle: { ...typography.bodyMedium, color: colors.text },
  rowDescription: { ...typography.caption, color: colors.textSecondary },
});
