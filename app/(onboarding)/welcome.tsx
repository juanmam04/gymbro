import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/lib/theme';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.brand}>GymBro</Text>
        <View style={styles.hero}>
          <Text style={styles.title}>Comer mejor es más fácil juntos.</Text>
          <Text style={styles.subtitle}>
            Registrá tus comidas con una foto y compartí tu progreso con alguien.
          </Text>
        </View>
        <View style={styles.spacer} />
        <Button title="Empezar" onPress={() => router.push('/(onboarding)/name')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.xl, gap: spacing.lg },
  brand: { ...typography.brand, color: colors.primary, marginTop: spacing.lg },
  hero: { gap: spacing.md, marginTop: spacing.xxl },
  title: { ...typography.h1, color: colors.text, fontSize: 32, lineHeight: 40 },
  subtitle: { ...typography.body, color: colors.textSecondary, fontSize: 18, lineHeight: 28 },
  spacer: { flex: 1 },
});
