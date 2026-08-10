import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { clearPendingInviteCode, savePendingInviteCode } from '@/features/partner/invite-utils';
import { colors, spacing, typography } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';
import { acceptPartnerInvite } from '@/services/partner';
import { getErrorMessage } from '@/utils/errors';
import { inviteCodeSchema, type InviteCodeInput } from '@/utils/validation';

export default function PartnerJoinScreen() {
  const { refreshBootstrap, gate, partner } = useAuth();
  const params = useLocalSearchParams<{ code?: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, setValue } = useForm<InviteCodeInput>({
    resolver: zodResolver(inviteCodeSchema),
    defaultValues: { code: '' },
  });

  useEffect(() => {
    if (typeof params.code === 'string' && params.code.length > 0) {
      setValue('code', params.code.toUpperCase());
    }
  }, [params.code, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true);
    setError(null);
    try {
      if (gate !== 'ready') {
        await savePendingInviteCode(values.code);
        router.replace('/');
        return;
      }

      await acceptPartnerInvite(values.code);
      await clearPendingInviteCode();
      await refreshBootstrap();
      router.replace('/(tabs)');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo aceptar el código'));
    } finally {
      setLoading(false);
    }
  });

  if (partner) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <Text style={styles.title}>Ya estás conectado</Text>
          <Text style={styles.subtitle}>Con {partner.display_name}.</Text>
          <Button title="Ir al inicio" onPress={() => router.replace('/(tabs)')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.title}>Tengo un código</Text>
        <Text style={styles.subtitle}>Pedile a tu compañero el código de 6 caracteres.</Text>

        <Controller
          control={control}
          name="code"
          render={({ field: { onChange, onBlur, value }, fieldState }) => (
            <Input
              label="Código"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              value={value}
              onBlur={onBlur}
              onChangeText={(text) => onChange(text.toUpperCase())}
              error={fieldState.error?.message}
            />
          )}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button title="Conectar" onPress={onSubmit} loading={loading} />
        <Button title="Cancelar" variant="ghost" onPress={() => router.replace('/(tabs)')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.xl, gap: spacing.lg },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary },
  error: { ...typography.caption, color: colors.danger },
});
