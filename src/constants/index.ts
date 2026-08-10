import type {
  ActivityLevel,
  BiologicalSex,
  GoalType,
} from '@/types/database';

export const GOAL_OPTIONS: { value: GoalType; label: string; description: string }[] = [
  {
    value: 'lose_fat',
    label: 'Perder grasa',
    description: 'Bajar de peso de forma sostenible',
  },
  {
    value: 'maintain',
    label: 'Mantenerme',
    description: 'Quedarme cerca de donde estoy',
  },
  {
    value: 'build_muscle',
    label: 'Ganar músculo',
    description: 'Construir fuerza y masa',
  },
  {
    value: 'eat_better',
    label: 'Comer mejor',
    description: 'Crear hábitos sin obsesionarme',
  },
];

export const SEX_OPTIONS: { value: BiologicalSex; label: string }[] = [
  { value: 'female', label: 'Mujer' },
  { value: 'male', label: 'Hombre' },
  { value: 'unspecified', label: 'Prefiero no decir' },
];

export const ACTIVITY_OPTIONS: {
  value: ActivityLevel;
  label: string;
  description: string;
}[] = [
  {
    value: 'little',
    label: 'Poco',
    description: 'La mayor parte del día sentado',
  },
  {
    value: 'some',
    label: 'Algo',
    description: 'Entreno o hago actividad 1–3 días por semana',
  },
  {
    value: 'quite',
    label: 'Bastante',
    description: 'Entreno 3–5 días por semana',
  },
  {
    value: 'lots',
    label: 'Mucho',
    description: 'Entreno casi todos los días',
  },
];

export const MEAL_TYPE_LABELS = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snack: 'Merienda',
  other: 'Comida',
} as const;

export const REACTION_OPTIONS = [
  { value: 'heart' as const, emoji: '❤️', label: 'Me gusta' },
  { value: 'fire' as const, emoji: '🔥', label: 'Brutal' },
  { value: 'strong' as const, emoji: '💪', label: 'Fuerte' },
  { value: 'yummy' as const, emoji: '😋', label: 'Rico' },
];

export const QUERY_KEYS = {
  session: ['session'] as const,
  profile: (userId?: string) => ['profile', userId] as const,
  partner: (userId?: string) => ['partner', userId] as const,
  goals: (userId?: string) => ['goals', userId] as const,
  feed: (userId?: string) => ['feed', userId] as const,
  todayTotals: (userId?: string) => ['todayTotals', userId] as const,
  weekTotals: (userId?: string) => ['weekTotals', userId] as const,
  activeInvite: (userId?: string) => ['activeInvite', userId] as const,
  waterToday: (userId?: string) => ['waterToday', userId] as const,
  weightLatest: (userId?: string) => ['weightLatest', userId] as const,
  weightHistory: (userId?: string) => ['weightHistory', userId] as const,
  savedMeals: (userId?: string) => ['savedMeals', userId] as const,
  sharedInvites: (userId?: string) => ['sharedInvites', userId] as const,
  challenges: (userId?: string) => ['challenges', userId] as const,
  meal: (mealId?: string) => ['meal', mealId] as const,
  mealsSince: (userId?: string) => ['mealsSince', userId] as const,
  dayMeals: (userId?: string, day?: string) => ['dayMeals', userId, day] as const,
};
