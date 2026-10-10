import { useRef, useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Redirect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RealNutritionScanProvider } from '@/features/nutrition/providers/RealNutritionScanProvider';
import { useScanDraftStore } from '@/stores/scan-draft';
import { useAuth } from '@/providers/AuthProvider';
import { useSubscription } from '@/hooks/useSubscription';
import { colors, typography } from '@/lib/theme';
import { getErrorMessage } from '@/utils/errors';
export default function TextMealScreen() {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const access = useSubscription();
  const queryClient = useQueryClient();
  const analyze = async () => {
    if (lock.current) return;
    if (access.data?.remaining === 0) {
      router.push('/subscription');
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      const result = await new RealNutritionScanProvider().scanText(text);
      useScanDraftStore.getState().reset();
      useScanDraftStore.getState().applyScanResult(result);
      router.replace('/meal/result');
    } catch (e) {
      Alert.alert('No pudimos analizar tu descripción', getErrorMessage(e), [
        { text: 'Cerrar' },
        { text: 'Agregar manualmente', onPress: () => router.push('/meal/manual') },
      ]);
    } finally {
      lock.current = false;
      setBusy(false);
      void queryClient.invalidateQueries({ queryKey: ['subscription'] });
    }
  };
  if (!user) return <Redirect href="/(auth)/login" />;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, gap: 18 }}
      >
        <Button title="← Volver" variant="ghost" disabled={busy} onPress={() => router.back()} />
        <Text style={typography.h1}>Qué comiste?</Text>
        <Text style={typography.body}>
          Por ejemplo: dos tostadas, dos huevos y un café con leche. Agregá cantidades si las sabés.
        </Text>
        <Input
          label="Tu comida"
          multiline
          maxLength={1000}
          value={text}
          onChangeText={setText}
          editable={!busy}
        />
        <Text style={typography.caption}>
          Las porciones son estimadas. Revisalas antes de guardar. Un análisis consume un uso de tu
          plan.
        </Text>
        <Button
          title="Analizar y revisar"
          disabled={text.trim().length < 3 || busy}
          loading={busy}
          onPress={() => void analyze()}
        />
        <Button
          title="Prefiero agregar manualmente"
          variant="secondary"
          disabled={busy}
          onPress={() => router.push('/meal/manual')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
