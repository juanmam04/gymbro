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
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/Avatar';
import { GOAL_OPTIONS } from '@/constants';
import { useAuth } from '@/providers/AuthProvider';
import { updateProfile } from '@/services/auth';
import { uploadAvatar } from '@/services/meals';
import { useSubscription } from '@/hooks/useSubscription';
import { colors, typography } from '@/lib/theme';
import { getErrorMessage } from '@/utils/errors';

export default function ProfileScreen() {
  const { user, profile, partner, goals, signOut, refreshBootstrap } = useAuth();
  const access = useSubscription();
  const [busy, setBusy] = useState(false);
  const mode = useMutation({
    mutationFn: () =>
      updateProfile(user!.id, {
        nutrition_display_mode:
          profile?.nutrition_display_mode === 'detailed' ? 'simple' : 'detailed',
      }),
    onSuccess: () => refreshBootstrap(),
    onError: (e) => Alert.alert('No pudimos guardar', getErrorMessage(e)),
  });
  const changePhoto = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Acceso a fotos', 'Podés habilitarlo en Ajustes.', [
          { text: 'Cerrar' },
          { text: 'Abrir Ajustes', onPress: () => void Linking.openSettings() },
        ]);
        return;
      }
      const image = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!image.canceled && image.assets[0]?.uri) {
        await updateProfile(user.id, {
          avatar_url: await uploadAvatar(user.id, image.assets[0].uri),
        });
        await refreshBootstrap();
      }
    } catch (e) {
      Alert.alert('No pudimos cambiar la foto', getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const rows: {
    title: string;
    detail?: string;
    icon: keyof typeof Ionicons.glyphMap;
    path: Href;
  }[] = [
    {
      title: 'Objetivos y peso',
      detail: GOAL_OPTIONS.find((g) => g.value === goals?.goal_type)?.label,
      icon: 'options-outline',
      path: '/settings/nutrition',
    },
    {
      title: 'Tu compañero',
      detail: partner?.display_name ?? 'Invitá a alguien',
      icon: 'people-outline',
      path: partner ? `/partner/${partner.id}` : '/partner/invite',
    },
    ...(!partner
      ? [{ title: 'Tengo un código', icon: 'key-outline' as const, path: '/partner/join' as Href }]
      : []),
    { title: 'Desafíos', detail: 'Una meta por semana', icon: 'flag-outline', path: '/challenges' },
    { title: 'Preferencias para comer', icon: 'restaurant-outline', path: '/coach' },
    { title: 'Historial', icon: 'time-outline', path: '/history' },
    { title: 'Privacidad', icon: 'shield-checkmark-outline', path: '/settings/privacy' },
    { title: 'Notificaciones', icon: 'notifications-outline', path: '/settings/notifications' },
    { title: 'Cuenta', icon: 'person-outline', path: '/settings/account' },
    { title: 'Condiciones y privacidad', icon: 'document-text-outline', path: '/settings/legal' },
  ];
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Tu perfil</Text>
        <View style={s.hero}>
          <Pressable
            disabled={busy}
            onPress={() => void changePhoto()}
            accessibilityLabel="Cambiar foto"
          >
            <Avatar name={profile?.display_name ?? 'U'} uri={profile?.avatar_url} size={60} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{profile?.display_name}</Text>
            <Text style={s.caption}>Tocá tu foto para cambiarla</Text>
          </View>
        </View>
        <Pressable style={s.plan} onPress={() => router.push('/subscription')}>
          <View>
            <Text style={s.planTitle}>
              Racha{' '}
              {access.data?.plan === 'duo'
                ? 'Dúo'
                : access.data?.plan === 'plus'
                  ? 'Plus'
                  : 'Plus →'}
            </Text>
            <Text style={s.planText}>
              {access.data?.plan && access.data.plan !== 'free'
                ? 'Administrar tu suscripción'
                : 'Registrá más fácil. Entendé tu semana.'}
            </Text>
          </View>
        </Pressable>
        <View style={s.group}>
          <View style={s.row}>
            <Ionicons name="stats-chart-outline" size={21} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>Mostrar números detallados</Text>
              <Text style={s.caption}>También podés usar mensajes simples</Text>
            </View>
            <Switch
              disabled={mode.isPending}
              value={profile?.nutrition_display_mode === 'detailed'}
              onValueChange={() => mode.mutate()}
              trackColor={{ true: colors.accent, false: colors.border }}
            />
          </View>
        </View>
        <View style={s.group}>
          {rows.map((r) => (
            <Pressable
              key={r.title}
              accessibilityRole="button"
              style={s.row}
              onPress={() => router.push(r.path)}
            >
              <Ionicons name={r.icon} size={21} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>{r.title}</Text>
                {r.detail && <Text style={s.caption}>{r.detail}</Text>}
              </View>
              <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
            </Pressable>
          ))}
        </View>
        <Pressable
          disabled={busy}
          style={s.logout}
          onPress={() =>
            Alert.alert('Cerrar sesión', 'Querés salir de tu cuenta?', [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Salir',
                onPress: async () => {
                  setBusy(true);
                  try {
                    await signOut();
                    router.replace('/(auth)/login');
                  } catch (e) {
                    Alert.alert('No pudimos salir', getErrorMessage(e));
                  } finally {
                    setBusy(false);
                  }
                },
              },
            ])
          }
        >
          <Text style={s.logoutText}>Cerrar sesión</Text>
        </Pressable>
        <Text style={s.caption}>RACHA · Un día a la vez</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 18, paddingBottom: 35 },
  title: { ...typography.h1, color: colors.text },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { ...typography.h3, color: colors.text },
  caption: { ...typography.caption, color: colors.textSecondary },
  plan: { backgroundColor: colors.primary, padding: 18, borderRadius: 18 },
  planTitle: { ...typography.h3, color: colors.white },
  planText: { ...typography.caption, color: '#D3E4D7', marginTop: 4 },
  group: { backgroundColor: colors.surface, borderRadius: 18, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 58,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowTitle: { ...typography.bodyMedium, color: colors.text },
  logout: { minHeight: 44, justifyContent: 'center' },
  logoutText: { ...typography.bodyMedium, color: colors.danger },
});
