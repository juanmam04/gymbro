import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { QUERY_KEYS } from '@/constants';
import {
  buildInviteDeepLink,
  buildInviteShareMessage,
} from '@/features/partner/invite-utils';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';
import { createPartnerInvite, getActiveInvite } from '@/services/partner';
import { getErrorMessage } from '@/utils/errors';

export default function PartnerInviteScreen() {
  const { user, partner, profile, refreshBootstrap } = useAuth();
  const [creating, setCreating] = useState(false);
  const [localCode, setLocalCode] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  const inviteQuery = useQuery({
    queryKey: QUERY_KEYS.activeInvite(user?.id),
    queryFn: () => getActiveInvite(user!.id),
    enabled: Boolean(user?.id) && !partner,
  });

  const code = localCode ?? inviteQuery.data?.code ?? null;
  const deepLink = code ? buildInviteDeepLink(code) : null;

  const ensureInvite = useCallback(async () => {
    if (!user || partner) return;
    setCreating(true);
    try {
      const invite = await createPartnerInvite();
      setLocalCode(invite.code);
      await inviteQuery.refetch();
    } catch (err) {
      Alert.alert('No se pudo crear la invitación', getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }, [user, partner, inviteQuery]);

  useEffect(() => {
    if (bootstrapped || inviteQuery.isLoading || partner) return;
    setBootstrapped(true);
    if (!inviteQuery.data?.code && !localCode) {
      void ensureInvite();
    }
  }, [bootstrapped, inviteQuery.isLoading, inviteQuery.data?.code, localCode, partner, ensureInvite]);

  const shareInvite = async () => {
    if (!code) return;
    try {
      await Share.share({
        message: buildInviteShareMessage(code, profile?.display_name),
      });
    } catch (err) {
      Alert.alert('No se pudo compartir', getErrorMessage(err));
    }
  };

  if (partner) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <Text style={styles.title}>Ya estás conectado</Text>
          <Text style={styles.subtitle}>
            Estás compartiendo el progreso con {partner.display_name}.
          </Text>
          <Button title="Volver" onPress={() => router.replace('/(tabs)')} />
        </View>
      </SafeAreaView>
    );
  }

  if (inviteQuery.isLoading && !code) {
    return <LoadingState message="Preparando invitación…" />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.title}>Invitar a alguien</Text>
        <Text style={styles.subtitle}>
          Compartí el link o el código. Cuando lo acepte, van a ver las comidas del otro.
        </Text>

        {code ? (
          <>
            <Pressable
              style={styles.codeBox}
              onPress={async () => {
                await Clipboard.setStringAsync(code);
                Alert.alert('Listo', 'Código copiado');
              }}
            >
              <Text style={styles.codeLabel}>Tu código</Text>
              <Text style={styles.code}>{code}</Text>
              <Text style={styles.copyHint}>Tocar para copiar</Text>
            </Pressable>

            {deepLink ? (
              <Pressable
                style={styles.linkBox}
                onPress={async () => {
                  await Clipboard.setStringAsync(deepLink);
                  Alert.alert('Listo', 'Link copiado');
                }}
              >
                <Text style={styles.linkLabel}>Link de invitación</Text>
                <Text style={styles.link}>{deepLink}</Text>
              </Pressable>
            ) : null}

            <Button title="Compartir invitación" onPress={shareInvite} />
            <Button
              title="Generar otro código"
              variant="secondary"
              onPress={ensureInvite}
              loading={creating}
            />
          </>
        ) : (
          <Button title="Generar invitación" onPress={ensureInvite} loading={creating} />
        )}

        <Button
          title="Listo"
          variant="ghost"
          onPress={async () => {
            await refreshBootstrap();
            router.replace('/(tabs)');
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.xl, gap: spacing.lg },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary },
  codeBox: {
    marginTop: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.xl,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  codeLabel: { ...typography.label, color: colors.textSecondary },
  code: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 42,
    letterSpacing: 8,
    color: colors.primary,
  },
  copyHint: { ...typography.caption, color: colors.textSecondary },
  linkBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  linkLabel: { ...typography.label, color: colors.textSecondary },
  link: { ...typography.bodyMedium, color: colors.primary },
});
