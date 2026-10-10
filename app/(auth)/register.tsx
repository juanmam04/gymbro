import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, spacing, typography } from '@/lib/theme';
import { signUpWithEmail } from '@/services/auth';
import { getErrorMessage } from '@/utils/errors';
import { registerSchema, type RegisterInput } from '@/utils/validation';

export default function RegisterScreen() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true);
    setError(null);
    try {
      const result = await signUpWithEmail(values);
      if (!result.session) {
        setError('Revisá tu email para confirmar la cuenta, o desactivá la confirmación en Supabase Auth.');
        return;
      }
      router.replace('/');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear la cuenta'));
    } finally {
      setLoading(false);
    }
  });

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.brand}>RACHA</Text>
            <Text style={styles.title}>Creá tu cuenta</Text>
            <Text style={styles.subtitle}>Empezá a registrar y compartir tu comida.</Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value }, fieldState }) => (
                <Input
                  label="Email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value }, fieldState }) => (
                <Input
                  label="Contraseña"
                  secureTextEntry
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value }, fieldState }) => (
                <Input
                  label="Confirmar contraseña"
                  secureTextEntry
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title="Crear cuenta" onPress={onSubmit} loading={loading} />
          </View>

          <Text style={styles.footer}>
            ¿Ya tenés cuenta?{' '}
            <Link href="/(auth)/login" style={styles.link}>
              Iniciá sesión
            </Link>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  hero: { gap: spacing.sm },
  brand: { ...typography.brand, color: colors.primary },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary },
  form: { gap: spacing.lg },
  error: { ...typography.caption, color: colors.danger },
  footer: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  link: { color: colors.primary, fontFamily: 'DMSans_500Medium' },
});
