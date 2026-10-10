import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { QUERY_KEYS } from '@/constants';
import { upsertNutritionGoals } from '@/services/partner';
import { addWeightEntry, fetchLatestWeight } from '@/services/weight';
import { calculateNutritionTargets } from '@/features/nutrition/services/calculateNutritionTargets';
import { nutritionGoalsSchema, type NutritionGoalsInput } from '@/utils/validation';
import { getErrorMessage } from '@/utils/errors';
import { colors, typography } from '@/lib/theme';
export default function NutritionSettingsScreen() {
  const { user, goals, profile, refreshBootstrap } = useAuth();
  const client = useQueryClient();
  const [weight, setWeight] = useState('');
  const { control, handleSubmit } = useForm<NutritionGoalsInput>({
    resolver: zodResolver(nutritionGoalsSchema),
    values: {
      calories: goals?.calories_target ?? 2200,
      protein: goals?.protein_target ?? 140,
      carbs: goals?.carbs_target ?? 220,
      fat: goals?.fat_target ?? 70,
    },
  });
  const latest = useQuery({
    queryKey: QUERY_KEYS.weightLatest(user?.id),
    queryFn: () => fetchLatestWeight(user!.id),
    enabled: Boolean(user),
  });
  const save = useMutation({
    mutationFn: (v: NutritionGoalsInput) => {
      if (!user || !goals) throw new Error('Faltan datos de tu cuenta.');
      return upsertNutritionGoals({ userId: user.id, ...v, goalType: goals.goal_type });
    },
    onSuccess: async () => {
      await refreshBootstrap();
      await client.invalidateQueries({ queryKey: ['goals'] });
      Alert.alert('Listo', 'Guardamos tus objetivos.');
    },
    onError: (e) => Alert.alert('No pudimos guardar', getErrorMessage(e)),
  });
  const recalculate = () => {
    if (
      !profile?.biological_sex ||
      !profile.birth_year ||
      !profile.height_cm ||
      !profile.weight_kg ||
      !profile.activity_level ||
      !goals
    ) {
      Alert.alert('Faltan datos', 'Completá tus datos para recalcular.');
      return;
    }
    const target = calculateNutritionTargets({
      sex: profile.biological_sex,
      ageYears: new Date().getFullYear() - profile.birth_year,
      heightCm: Number(profile.height_cm),
      weightKg: Number(latest.data?.weight_kg ?? profile.weight_kg),
      activity: profile.activity_level,
      goalType: goals.goal_type,
    });
    save.mutate(target);
  };
  const saveWeight = useMutation({
    mutationFn: () => {
      const value = Number(weight.replace(',', '.'));
      if (!Number.isFinite(value) || value < 30 || value > 300)
        throw new Error('Ingresá un peso entre 30 y 300 kg.');
      return addWeightEntry(user!.id, value);
    },
    onSuccess: async () => {
      setWeight('');
      await client.invalidateQueries({ queryKey: QUERY_KEYS.weightLatest(user?.id) });
      await client.invalidateQueries({ queryKey: QUERY_KEYS.weightHistory(user?.id) });
      await refreshBootstrap();
    },
    onError: (e) => Alert.alert('No pudimos guardar', getErrorMessage(e)),
  });
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Button title="← Volver" variant="ghost" onPress={() => router.back()} />
        <Text style={typography.h1}>Objetivos y peso</Text>
        <Text style={typography.caption}>
          Referencias personales y estimadas. No necesitás cumplir números exactos para sumar a tu
          racha.
        </Text>
        <View style={{ padding: 18, borderRadius: 18, backgroundColor: colors.surface, gap: 12 }}>
          {(['calories', 'protein', 'carbs', 'fat'] as const).map((field) => (
            <Controller
              key={field}
              control={control}
              name={field}
              render={({ field: { value, onChange }, fieldState }) => (
                <Input
                  label={
                    {
                      calories: 'Calorías',
                      protein: 'Proteína (g)',
                      carbs: 'Carbohidratos (g)',
                      fat: 'Grasas (g)',
                    }[field]
                  }
                  keyboardType="number-pad"
                  value={String(value)}
                  onChangeText={(t) => onChange(Number(t.replace(/[^0-9]/g, '')))}
                  error={fieldState.error?.message}
                />
              )}
            />
          ))}
          <Button
            title="Guardar objetivos"
            loading={save.isPending}
            onPress={handleSubmit((v) => save.mutate(v))}
          />
          <Button
            title="Recalcular con mis datos"
            variant="ghost"
            disabled={save.isPending}
            onPress={recalculate}
          />
        </View>
        <View style={{ padding: 18, borderRadius: 18, backgroundColor: colors.surface, gap: 12 }}>
          <Text style={typography.h3}>Peso</Text>
          <Text style={typography.body}>
            {latest.isLoading
              ? 'Cargando…'
              : latest.isError
                ? 'No pudimos cargar tu último peso.'
                : latest.data
                  ? `Último registro: ${latest.data.weight_kg} kg`
                  : 'Todavía no hay registros'}
          </Text>
          <Input
            label="Nuevo peso (kg)"
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={setWeight}
          />
          <Button
            title="Guardar peso"
            loading={saveWeight.isPending}
            onPress={() => saveWeight.mutate()}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
