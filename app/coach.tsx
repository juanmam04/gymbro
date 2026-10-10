import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/Button';
import { fetchMealsSince } from '@/services/meals';
import {
  dailyGuidance,
  mealIdeas,
  DEFAULT_PREFERENCES,
  type FoodPreferences,
} from '@/features/coaching/coach';
import { useSubscription } from '@/hooks/useSubscription';
import { colors, typography } from '@/lib/theme';
export default function CoachScreen() {
  const { user, goals } = useAuth();
  const access = useSubscription();
  const [prefs, setPrefs] = useState<FoodPreferences>(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const key = `racha:preferences:${user?.id}`;
  useEffect(() => {
    let active = true;
    setReady(false);
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (active) {
          try {
            const value = raw ? JSON.parse(raw) : {};
            setPrefs({
              vegetarian: value.vegetarian === true,
              dairyFree: value.dairyFree === true,
              budget: value.budget === 'flexible' ? 'flexible' : 'low',
            });
          } catch {
            setPrefs(DEFAULT_PREFERENCES);
          }
          setReady(true);
        }
      })
      .catch(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [key]);
  const update = (next: FoodPreferences) => {
    setPrefs(next);
    setSaveError(false);
    void AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => setSaveError(true));
  };
  const meals = useQuery({
    queryKey: ['coachMeals', user?.id, new Date().toDateString()],
    queryFn: () => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return fetchMealsSince(user!.id, d.toISOString());
    },
    enabled: Boolean(user),
  });
  const guidance = dailyGuidance(
    (meals.data ?? []).map((m) => ({
      eatenAt: m.eaten_at,
      protein: Number(m.total_protein),
      calories: Number(m.total_calories),
    })),
    goals?.protein_target ?? 140,
  );
  const premium = Boolean(access.data && access.data.plan !== 'free');
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <Button title="← Volver" variant="ghost" onPress={() => router.back()} />
        <Text style={s.title}>Tu próximo paso</Text>
        <View style={s.card}>
          <Text style={s.heading}>
            {meals.isLoading
              ? 'Revisando tus registros…'
              : meals.isError
                ? 'No pudimos cargar tus registros'
                : guidance.title}
          </Text>
          {!meals.isLoading && !meals.isError && <Text style={s.body}>{guidance.detail}</Text>}
          {meals.isError && <Button title="Reintentar" onPress={() => void meals.refetch()} />}
        </View>
        <Text style={s.heading}>Ideas simples para comer</Text>
        {premium ? (
          <View style={s.card}>
            <Text style={s.heading}>Tus preferencias</Text>
            <View style={s.row}>
              <Text style={s.body}>Vegetariano</Text>
              <Switch
                disabled={!ready}
                value={prefs.vegetarian}
                onValueChange={(v) => update({ ...prefs, vegetarian: v })}
              />
            </View>
            <View style={s.row}>
              <Text style={s.body}>Sin lácteos</Text>
              <Switch
                disabled={!ready}
                value={prefs.dairyFree}
                onValueChange={(v) => update({ ...prefs, dairyFree: v })}
              />
            </View>
            <View style={s.row}>
              <Text style={s.body}>Priorizar opciones económicas</Text>
              <Switch
                disabled={!ready}
                value={prefs.budget === 'low'}
                onValueChange={(v) => update({ ...prefs, budget: v ? 'low' : 'flexible' })}
              />
            </View>
            {saveError && (
              <Text style={s.body}>No pudimos guardar las preferencias en este dispositivo.</Text>
            )}
          </View>
        ) : (
          <Pressable style={s.card} onPress={() => router.push('/subscription')}>
            <Text style={s.heading}>Ideas según tus preferencias · Plus →</Text>
            <Text style={s.body}>Elegí opciones vegetarianas, sin lácteos y económicas.</Text>
          </Pressable>
        )}
        {mealIdeas(premium ? prefs : DEFAULT_PREFERENCES)
          .slice(0, premium ? 5 : 2)
          .map((i) => (
            <View key={i.title} style={s.card}>
              <Text style={s.heading}>{i.title}</Text>
              <Text style={s.body}>{i.detail}</Text>
              <Button
                title="Registrar esta comida"
                variant="ghost"
                onPress={() => router.push('/meal/text')}
              />
            </View>
          ))}
        <Text style={s.caption}>
          Ideas generales, no un plan clínico. Revisá ingredientes y etiquetas según tus alergias.
          Las preferencias se guardan en este dispositivo.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16 },
  title: { ...typography.h1, color: colors.text },
  heading: { ...typography.h3, color: colors.text },
  body: { ...typography.body, color: colors.textSecondary },
  caption: { ...typography.caption, color: colors.textSecondary },
  card: { backgroundColor: colors.surface, padding: 18, borderRadius: 18, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
