import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { getNutritionScanProvider } from '@/features/nutrition/scan-provider';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { useScanDraftStore } from '@/stores/scan-draft';
import { useSubscription } from '@/hooks/useSubscription';
import { useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/errors';

const PHASES = [
  'Mirando tu comida…',
  'Identificando alimentos…',
  'Calculando cantidades…',
  'Preparando el resultado…',
];

export default function ScanScreen() {
  const access = useSubscription();
  const queryClient = useQueryClient();
  const isFocused = useIsFocused();
  const [taking, setTaking] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const imageUri = useScanDraftStore((s) => s.imageUri);
  const isAnalyzing = useScanDraftStore((s) => s.isAnalyzing);
  const analyzingPhase = useScanDraftStore((s) => s.analyzingPhase);
  const setImageUri = useScanDraftStore((s) => s.setImageUri);
  const setAnalyzing = useScanDraftStore((s) => s.setAnalyzing);
  const applyScanResult = useScanDraftStore((s) => s.applyScanResult);
  const reset = useScanDraftStore((s) => s.reset);
  const requestRef = useRef(0);

  useEffect(() => {
    if (!isAnalyzing) return;
    let i = 0;
    setAnalyzing(true, PHASES[0]);
    const id = setInterval(() => {
      i = Math.min(i + 1, PHASES.length - 1);
      setAnalyzing(true, PHASES[i]);
    }, 1600);
    return () => clearInterval(id);
  }, [isAnalyzing, setAnalyzing]);

  const askCameraPermission = async () => {
    const result = await requestPermission();
    if (!result.granted) {
      Alert.alert(
        'Cámara desactivada',
        'Racha usa la cámara para escanear y registrar tus comidas. Podés habilitarla en Ajustes.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir Ajustes', onPress: () => void Linking.openSettings() },
        ],
      );
    }
  };

  const takePhoto = async () => {
    if (taking) return;
    setTaking(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) setImageUri(photo.uri);
    } catch (error) {
      Alert.alert('No pudimos sacar la foto', getErrorMessage(error));
    } finally {
      setTaking(false);
    }
  };

  const pickFromLibrary = async () => {
    const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!mediaPermission.granted) {
      Alert.alert(
        'Acceso a fotos',
        'Racha usa tus fotos para que puedas registrar comidas. Podés habilitarlo en Ajustes.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir Ajustes', onPress: () => void Linking.openSettings() },
        ],
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]?.uri) setImageUri(result.assets[0].uri);
  };

  const analyze = async () => {
    if (!imageUri) return;
    if (access.data?.remaining === 0) {
      router.push('/subscription');
      return;
    }
    const requestId = ++requestRef.current;
    setAnalyzing(true, PHASES[0]);
    try {
      const provider = getNutritionScanProvider();
      const result = await provider.scanFood(imageUri);
      if (requestRef.current !== requestId) return;
      if (result.multiplePlatesSuspected) {
        Alert.alert(
          'Vemos más de un plato',
          'Para un resultado más preciso, acercate a tu plato y sacá otra foto.',
          [
            { text: 'Otra foto', onPress: () => setImageUri(null) },
            {
              text: 'Continuar igual',
              onPress: () => {
                applyScanResult(result);
                router.push('/meal/result');
              },
            },
          ],
        );
        setAnalyzing(false);
        return;
      }
      applyScanResult(result);
      router.push('/meal/result');
    } catch (err) {
      if (requestRef.current !== requestId) return;
      setAnalyzing(false);
      Alert.alert('No pudimos identificar bien esta comida', getErrorMessage(err), [
        { text: 'Otra foto', onPress: () => setImageUri(null) },
        { text: 'Agregar manualmente', onPress: () => router.push('/meal/manual') },
        { text: 'Ver mi plan', onPress: () => router.push('/subscription') },
        { text: 'Cerrar', style: 'cancel' },
      ]);
    } finally {
      void queryClient.invalidateQueries({ queryKey: ['subscription'] });
    }
  };

  if (!permission) return <LoadingState />;

  if (!permission.granted && !imageUri && !isAnalyzing) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permission}>
          <Text style={styles.title}>Cámara para escanear</Text>
          <Text style={styles.subtitle}>
            Racha usa la cámara para escanear y registrar tus comidas. También podés elegir una foto
            de la galería.
          </Text>
          <Button title="Permitir cámara" onPress={() => void askCameraPermission()} />
          <Button
            title="Elegir de la galería"
            onPress={() => void pickFromLibrary()}
            variant="secondary"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (isAnalyzing) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permission}>
          <LoadingState message={analyzingPhase ?? PHASES[0]} />
          <Button
            title="Cancelar"
            variant="ghost"
            onPress={() => {
              requestRef.current += 1;
              setAnalyzing(false);
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (imageUri) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.previewWrap}>
          <Text style={styles.title}>Revisá tu foto</Text>
          <Image source={{ uri: imageUri }} style={styles.preview} contentFit="cover" />
          <Text style={styles.hint}>
            La estimación no es una medición exacta. Vas a poder corregirla antes de guardar.
          </Text>
          <Button title="Analizar comida" onPress={() => void analyze()} />
          <Button title="Sacar otra" onPress={() => setImageUri(null)} variant="secondary" />
          <Button title="Cancelar" variant="ghost" onPress={() => reset()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.camera}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          active={isFocused}
        />
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>Escaneá tu comida</Text>
          <View style={styles.controls}>
            <Pressable
              style={styles.sideButton}
              onPress={() => void pickFromLibrary()}
              accessibilityLabel="Galería"
            >
              <Ionicons name="images-outline" size={28} color={colors.white} />
            </Pressable>
            <Pressable
              disabled={taking}
              style={styles.shutter}
              onPress={() => void takePhoto()}
              accessibilityLabel="Tomar foto"
            />
            <Pressable
              style={styles.sideButton}
              onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
              accessibilityLabel="Cambiar cámara"
            >
              <Ionicons name="camera-reverse-outline" size={28} color={colors.white} />
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.black },
  permission: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  hint: { ...typography.caption, color: colors.textSecondary },
  previewWrap: {
    flex: 1,
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  preview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  overlayTitle: {
    ...typography.h3,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sideButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: colors.white,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
});
