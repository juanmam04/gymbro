import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { QUERY_KEYS } from '@/constants';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';
import { updateProfile } from '@/services/auth';
import { registerForPushNotificationsAsync } from '@/services/notifications';
import type { Profile } from '@/types/database';
import { getHumanErrorMessage } from '@/utils/errors';

type NotifKey = 'notif_social' | 'notif_reminders' | 'notif_progress';

const OPTIONS: { key: NotifKey; title: string; description: string }[] = [
  {
    key: 'notif_social',
    title: 'Actividad social',
    description: 'Reacciones, comentarios y comidas compartidas.',
  },
  {
    key: 'notif_reminders',
    title: 'Recordatorios',
    description: 'Un aviso diario a las 19:30, hora de tu teléfono.',
  },
  {
    key: 'notif_progress',
    title: 'Progreso',
    description: 'Un aviso para revisar la semana los domingos a las 20:00.',
  },
];

export default function NotificationsSettingsScreen() {
  const { user, profile, refreshBootstrap } = useAuth();
  const queryClient = useQueryClient();
  const [enablingPush, setEnablingPush] = useState(false);

  const mutation = useMutation({
    mutationFn: async (patch: Pick<Profile, NotifKey>) => {
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

  const enableDevicePush = async () => {
    if (!user) return;
    setEnablingPush(true);
    try {
      const result = await registerForPushNotificationsAsync(user.id, { requestPermission: true });
      if (result.status === 'denied') {
        Alert.alert(
          'Notificaciones desactivadas',
          'Para recibir avisos, habilitá las notificaciones de Racha en Ajustes del sistema.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Abrir Ajustes', onPress: () => void Linking.openSettings() },
          ],
        );
        return;
      }
      if (result.status === 'unavailable') {
        Alert.alert(
          'No disponible',
          'Las notificaciones push requieren un dispositivo físico. En simulador no se registran.',
        );
        return;
      }
      Alert.alert('Listo', 'Las notificaciones del dispositivo quedaron activadas.');
    } catch (error) {
      Alert.alert('Error', getHumanErrorMessage(error));
    } finally {
      setEnablingPush(false);
    }
  };

  const toggle = (key: NotifKey, value: boolean) => {
    if (value) {
      void enableDevicePush();
    }
    mutation.mutate({ [key]: value } as Pick<Profile, NotifKey>);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Notificaciones</Text>
          <View style={{ width: 28 }} />
        </View>

        <Text style={styles.intro}>
          Elegí qué avisos querés recibir. El permiso del sistema se pide solo cuando lo activás.
        </Text>

        <Button
          title="Activar notificaciones del dispositivo"
          variant="secondary"
          loading={enablingPush}
          onPress={() => void enableDevicePush()}
        />

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
