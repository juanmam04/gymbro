import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/providers/AuthProvider';
import { QUERY_KEYS } from '@/constants';
import { fetchMealsSince } from '@/services/meals';
import { createChallenge, fetchActiveChallenges, currentWeekStart } from '@/services/challenges';
import { countMealsByLocalDay, dayKey, lastNDayKeys } from '@/features/streaks/calculateStreaks';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/utils/errors';
import { colors, typography } from '@/lib/theme';
export default function ChallengesScreen() {
  const { user, partner } = useAuth();
  const client = useQueryClient();
  const start = new Date(`${currentWeekStart()}T00:00:00`).toISOString();
  const challenges = useQuery({
    queryKey: QUERY_KEYS.challenges(user?.id),
    queryFn: () => fetchActiveChallenges(user!.id),
    enabled: Boolean(user),
  });
  const mine = useQuery({
    queryKey: ['challengeMeals', user?.id, start],
    queryFn: () => fetchMealsSince(user!.id, start),
    enabled: Boolean(user),
  });
  const theirs = useQuery({
    queryKey: ['challengeMeals', partner?.id, start],
    queryFn: () => fetchMealsSince(partner!.id, start),
    enabled: Boolean(partner?.share_meals),
  });
  const targetDays = Math.min(5, 8 - (new Date().getDay() || 7));
  const startChallenge = useMutation({
    mutationFn: () =>
      createChallenge({
        userId: user!.id,
        partnerId: partner?.id,
        scope: partner ? 'joint' : 'personal',
        metric: 'log_meals_days',
        title: `Una comida, ${targetDays} días`,
        targetDays,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: QUERY_KEYS.challenges(user?.id) }),
    onError: (e) => Alert.alert('No pudimos crear el desafío', getErrorMessage(e)),
  });
  const nudge = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('send-support', {
        body: { recipientId: partner!.id },
      });
      if (error) {
        try {
          const response = await (error as { context: Response }).context.json();
          throw new Error(response.error);
        } catch (e) {
          throw e instanceof Error ? e : new Error('No pudimos enviar el toque.');
        }
      }
      return data;
    },
    onSuccess: () => Alert.alert('Enviado', 'Mandamos un toque de apoyo.'),
    onError: (e) => Alert.alert('Toque de apoyo', getErrorMessage(e)),
  });
  const myDays = countMealsByLocalDay((mine.data ?? []).map((m) => ({ eatenAt: m.eaten_at })));
  const partnerDays = countMealsByLocalDay(
    (theirs.data ?? []).map((m) => ({ eatenAt: m.eaten_at })),
  );
  const days = lastNDayKeys(7).filter((d) => d >= currentWeekStart());
  const active = (challenges.data ?? []).filter((c) => c.metric === 'log_meals_days');
  const unavailable = mine.isLoading || mine.isError;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
        <Button title="← Volver" variant="ghost" onPress={() => router.back()} />
        <Text style={typography.h1}>Un día a la vez</Text>
        <Text style={typography.body}>
          Registrar una comida suma. No hace falta cumplir calorías exactas ni comer perfecto.
        </Text>
        <View style={{ padding: 18, borderRadius: 18, backgroundColor: colors.surface, gap: 12 }}>
          <Text style={typography.h3}>Esta semana</Text>
          {unavailable ? (
            <Text style={typography.body}>
              {mine.isError ? 'No pudimos cargar tus registros.' : 'Cargando…'}
            </Text>
          ) : (
            days.map((d) => (
              <View
                key={d}
                style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}
              >
                <Text style={typography.body}>{d === dayKey(new Date()) ? 'Hoy' : d.slice(5)}</Text>
                <Text style={typography.body}>
                  {(myDays.get(d) ?? 0) > 0 ? 'Vos ✓' : 'Vos ·'}
                  {partner
                    ? !partner.share_meals
                      ? ' · Compañero privado'
                      : theirs.isLoading || theirs.isError
                        ? ' · Sin datos del compañero'
                        : (partnerDays.get(d) ?? 0) > 0
                          ? ' · Compañero ✓'
                          : ' · Compañero pendiente'
                    : ''}
                </Text>
              </View>
            ))
          )}
        </View>
        {challenges.isLoading ? (
          <Text style={typography.body}>Cargando desafíos…</Text>
        ) : challenges.isError ? (
          <Button title="Reintentar desafíos" onPress={() => void challenges.refetch()} />
        ) : active.length ? (
          active.map((c) => {
            const jointAvailable =
              c.scope !== 'joint' || (partner?.share_meals && !theirs.isError && !theirs.isLoading);
            const completed = days.filter(
              (d) =>
                (myDays.get(d) ?? 0) > 0 && (c.scope !== 'joint' || (partnerDays.get(d) ?? 0) > 0),
            ).length;
            return (
              <View
                key={c.id}
                style={{ padding: 18, borderRadius: 18, backgroundColor: colors.primary, gap: 8 }}
              >
                <Text style={{ ...typography.h3, color: colors.white }}>{c.title}</Text>
                <Text style={{ ...typography.body, color: colors.white }}>
                  {unavailable || !jointAvailable
                    ? 'Necesitamos registros compartidos para calcular el desafío.'
                    : `${Math.min(completed, c.target_days)} / ${c.target_days} días${completed >= c.target_days ? ' · Completado!' : ''}`}
                </Text>
                <Text style={{ ...typography.caption, color: '#D3E4D7' }}>
                  {c.scope === 'joint'
                    ? 'Cuenta cuando ambos registran una comida ese día.'
                    : 'Cuenta cuando registrás una comida ese día.'}
                </Text>
              </View>
            );
          })
        ) : (
          <Button
            title={
              partner
                ? `Empezar juntos · ${targetDays} días`
                : `Empezar desafío · ${targetDays} días`
            }
            loading={startChallenge.isPending}
            onPress={() => startChallenge.mutate()}
          />
        )}
        {partner && (
          <Button
            title="Mandar un toque de apoyo"
            variant="secondary"
            loading={nudge.isPending}
            onPress={() => nudge.mutate()}
          />
        )}
        <Text style={typography.caption}>
          Los desafíos van de lunes a domingo. Si faltás un día, tus registros anteriores siguen
          contando para tu progreso.
        </Text>
        <Button
          title="Ver mi progreso"
          variant="ghost"
          onPress={() => router.push('/(tabs)/progress')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
