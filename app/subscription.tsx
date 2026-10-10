import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Redirect } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/providers/AuthProvider';
import { billingAvailable, offerings, purchase, restore } from '@/services/subscription';
import { useSubscription } from '@/hooks/useSubscription';
import { colors, typography } from '@/lib/theme';
import { getErrorMessage } from '@/utils/errors';

export default function SubscriptionScreen() {
  const { user } = useAuth();
  const access = useSubscription();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const packs = useQuery({
    queryKey: ['offerings', user?.id],
    queryFn: () => offerings(user!.id),
    enabled: Boolean(user) && billingAvailable,
  });
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
      await client.invalidateQueries({ queryKey: ['subscription'] });
      Alert.alert('Listo', 'Actualizamos tu acceso.');
    } catch (error) {
      if (!(error as { userCancelled?: boolean }).userCancelled)
        Alert.alert('No pudimos completar la operación', getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  if (!user) return <Redirect href="/(auth)/login" />;
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={s.link}>← Volver</Text>
        </Pressable>
        <Text style={s.eyebrow}>RACHA PLUS</Text>
        <Text style={s.title}>Menos esfuerzo. Más constancia.</Text>
        <Text style={s.body}>
          Registrá por foto o texto, recibí ideas según tus preferencias y entendé tu semana.
        </Text>
        <View style={s.card}>
          <Text style={s.heading}>Tu plan</Text>
          <Text style={s.body}>
            {access.isLoading
              ? 'Consultando…'
              : access.isError
                ? 'No pudimos consultar tu plan.'
                : `${access.data?.plan.toUpperCase()} · ${access.data?.remaining} análisis disponibles`}
          </Text>
          {access.isError && <Button title="Reintentar" onPress={() => void access.refetch()} />}
        </View>
        <View style={s.card}>
          <Text style={s.heading}>Plus</Text>
          <Text style={s.body}>
            90 análisis por mes calendario, orientación diaria, preferencias e informe semanal.
          </Text>
          <Text style={s.heading}>Dúo</Text>
          <Text style={s.body}>
            Plus para vos y tu compañero conectado. Cada uno tiene sus propios 90 análisis y
            objetivos.
          </Text>
        </View>
        {!billingAvailable ? (
          <Text style={s.body}>
            Las compras todavía no están disponibles en esta versión. Podés seguir usando el
            registro manual y tu historial.
          </Text>
        ) : packs.isLoading ? (
          <Text style={s.body}>Cargando precios de la tienda…</Text>
        ) : packs.isError ? (
          <Button title="Reintentar precios" onPress={() => void packs.refetch()} />
        ) : !packs.data?.length ? (
          <Text style={s.body}>La tienda todavía no tiene planes disponibles.</Text>
        ) : (
          packs.data.map((pack) => (
            <View key={pack.identifier} style={s.card}>
              <Text style={s.heading}>{pack.product.title}</Text>
              <Text style={s.body}>{pack.product.description}</Text>
              <Button
                title={`${pack.product.priceString} · ${pack.packageType === 'ANNUAL' ? 'por año' : pack.packageType === 'MONTHLY' ? 'por mes' : (pack.product.subscriptionPeriod ?? 'ver período en la tienda')}`}
                disabled={busy}
                onPress={() => void run(() => purchase(user!.id, pack))}
              />
            </View>
          ))
        )}
        {billingAvailable && (
          <Button
            title="Restaurar compras"
            variant="secondary"
            loading={busy}
            onPress={() => void run(() => restore(user!.id))}
          />
        )}
        <Text style={s.caption}>
          El precio y el período se confirman en la tienda. La suscripción se renueva
          automáticamente salvo que la canceles en tu cuenta de Apple o Google. Al cancelar,
          conservás tus registros.
        </Text>
        <Pressable
          onPress={() => void Linking.openURL('https://apps.apple.com/account/subscriptions')}
        >
          <Text style={s.link}>Administrar suscripción en Apple</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            void Linking.openURL('https://play.google.com/store/account/subscriptions')
          }
        >
          <Text style={s.link}>Administrar suscripción en Google Play</Text>
        </Pressable>
        <Button
          title="Privacidad y condiciones"
          variant="ghost"
          onPress={() => router.push('/settings/legal')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 18, paddingBottom: 40 },
  title: { ...typography.brand, color: colors.text },
  eyebrow: { ...typography.label, color: colors.primary, letterSpacing: 2 },
  heading: { ...typography.h3, color: colors.text },
  body: { ...typography.body, color: colors.textSecondary },
  caption: { ...typography.caption, color: colors.textSecondary },
  link: { ...typography.bodyMedium, color: colors.primary, paddingVertical: 8 },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 18, gap: 12 },
});
