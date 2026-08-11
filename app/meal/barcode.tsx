import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { getBarcodeNutritionProvider } from '@/features/nutrition/providers/FoodNutritionProviders';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { useScanDraftStore } from '@/stores/scan-draft';
import { createEditableFromPer100g } from '@/utils/nutrition';
import { getErrorMessage } from '@/utils/errors';
import type { BarcodeProduct } from '@/types/nutrition';

export default function BarcodeScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [servings, setServings] = useState(1);
  const [loading, setLoading] = useState(false);
  const locked = useRef(false);
  const setItems = useScanDraftStore((s) => s.setItems);
  const setImageUri = useScanDraftStore((s) => s.setImageUri);
  const reset = useScanDraftStore((s) => s.reset);

  const onBarcode = async (result: BarcodeScanningResult) => {
    if (locked.current || loading || product) return;
    const code = result.data?.trim();
    if (!code) return;
    locked.current = true;
    setLoading(true);
    try {
      const found = await getBarcodeNutritionProvider().lookupBarcode(code);
      if (!found) {
        Alert.alert('Producto no encontrado', 'Podés buscarlo o cargarlo manualmente.', [
          { text: 'Buscar', onPress: () => router.replace('/meal/search') },
          { text: 'Manual', onPress: () => router.replace('/meal/manual') },
          { text: 'Reintentar', onPress: () => { locked.current = false; } },
        ]);
        return;
      }
      setProduct(found);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
      locked.current = false;
    } finally {
      setLoading(false);
    }
  };

  const confirm = () => {
    if (!product) return;
    const grams = Math.max(1, product.servingGrams * servings);
    reset();
    setImageUri(null);
    setItems([
      createEditableFromPer100g({
        name: product.brand ? `${product.displayName} (${product.brand})` : product.displayName,
        grams,
        per100g: product.per100g,
        source: 'barcode',
        barcode: product.barcode,
        nutritionProvider: product.source,
        nutritionFoodId: product.barcode,
      }),
    ]);
    router.push('/meal/result');
  };

  if (!permission) return <LoadingState />;
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.title}>Escanear código</Text>
          <Text style={styles.body}>Necesitamos la cámara para leer el código de barras.</Text>
          <Button title="Permitir cámara" onPress={() => void requestPermission()} />
        </View>
      </SafeAreaView>
    );
  }

  if (loading) return <LoadingState message="Buscando producto…" />;

  if (product) {
    const grams = product.servingGrams * servings;
    const kcal = (product.per100g.calories * grams) / 100;
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.title}>{product.displayName}</Text>
          {product.brand ? <Text style={styles.body}>{product.brand}</Text> : null}
          <Text style={styles.body}>
            Porción: {product.servingLabel ?? `${product.servingGrams} g`}
          </Text>
          <View style={styles.qtyRow}>
            <Button title="−" variant="secondary" onPress={() => setServings((s) => Math.max(0.5, s - 0.5))} />
            <Text style={styles.qty}>{servings}</Text>
            <Button title="+" variant="secondary" onPress={() => setServings((s) => s + 0.5)} />
          </View>
          <Text style={styles.body}>≈ {Math.round(kcal)} kcal · ≈ {Math.round(grams)} g</Text>
          <Button title="Continuar" onPress={confirm} />
          <Button
            title="Escanear otro"
            variant="ghost"
            onPress={() => {
              setProduct(null);
              locked.current = false;
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={(r) => void onBarcode(r)}
      >
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>Apuntá al código de barras</Text>
          <View style={styles.frame} />
          <Button title="Cancelar" variant="secondary" onPress={() => router.back()} />
        </View>
      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  title: { ...typography.h2, color: colors.text },
  body: { ...typography.body, color: colors.textSecondary },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, justifyContent: 'center' },
  qty: { ...typography.h2, color: colors.text, minWidth: 48, textAlign: 'center' },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  overlayTitle: { ...typography.h3, color: colors.white, textAlign: 'center' },
  frame: {
    alignSelf: 'center',
    width: '80%',
    height: 140,
    borderWidth: 2,
    borderColor: colors.white,
    borderRadius: radius.md,
    marginBottom: spacing.xxl,
  },
});
