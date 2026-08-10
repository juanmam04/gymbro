import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';
import { deleteAccount } from '@/services/account';
import { getHumanErrorMessage } from '@/utils/errors';

export default function AccountSettingsScreen() {
  const { signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = () => {
    Alert.alert(
      'Eliminar cuenta',
      'Se borrarán tu cuenta, comidas, fotos, peso, tokens de notificación y la conexión con tu partner. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmación final',
              '¿Seguro que querés eliminar tu cuenta de GymBro para siempre?',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Eliminar definitivamente',
                  style: 'destructive',
                  onPress: () => void runDelete(),
                },
              ],
            );
          },
        },
      ],
    );
  };

  const runDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      await signOut();
      router.replace('/(auth)/login');
      Alert.alert('Cuenta eliminada', 'Tu cuenta y datos asociados fueron eliminados.');
    } catch (error) {
      Alert.alert('No se pudo eliminar', getHumanErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityLabel="Volver">
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Cuenta</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Eliminar cuenta</Text>
          <Text style={styles.cardBody}>
            Si eliminás tu cuenta, borraremos tu perfil, historial de comidas, fotos subidas, preferencias,
            tokens de dispositivo y la conexión con tu partner. No podrás recuperar estos datos.
          </Text>
          <Button
            title="Eliminar cuenta"
            variant="danger"
            loading={deleting}
            onPress={confirmDelete}
          />
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTitle: { ...typography.h3, color: colors.text },
  cardBody: { ...typography.body, color: colors.textSecondary },
});
