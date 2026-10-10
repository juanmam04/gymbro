import { dayKey, lastNDayKeys } from '@/features/streaks/calculateStreaks';

export interface LoggedMeal {
  eatenAt: string;
  protein: number;
  calories: number;
}
export interface FoodPreferences {
  vegetarian: boolean;
  dairyFree: boolean;
  budget: 'low' | 'flexible';
}
export const DEFAULT_PREFERENCES: FoodPreferences = {
  vegetarian: false,
  dairyFree: false,
  budget: 'low',
};

export function dailyGuidance(meals: LoggedMeal[], proteinTarget: number, now = new Date()) {
  const today = meals.filter((m) => dayKey(new Date(m.eatenAt)) === dayKey(now));
  const protein = today.reduce((sum, m) => sum + Number(m.protein), 0);
  if (!today.length)
    return {
      title: 'Empezá por una comida',
      detail: 'Sacale una foto o escribí qué comiste. Un registro alcanza para sumar un día.',
      focus: 'logging' as const,
    };
  if (today.length < 2)
    return {
      title: 'Tu primer registro ya suma',
      detail:
        'Todavía tenemos una parte del día. Registrá tu próxima comida para ver un panorama más completo.',
      focus: 'logging' as const,
    };
  if (protein < proteinTarget * 0.6)
    return {
      title: 'Una idea para tu próxima comida',
      detail:
        'En lo que registraste aparece poca proteína respecto de tu objetivo. Podés sumar una fuente de proteína; no hace falta compensar ni saltear comidas.',
      focus: 'protein' as const,
    };
  return {
    title: 'Seguí a tu ritmo',
    detail:
      'Ya registraste varias comidas. Revisá las porciones estimadas y seguí con tu alimentación habitual.',
    focus: 'variety' as const,
  };
}

export function mealIdeas(p: FoodPreferences) {
  const ideas = [
    {
      title: 'Lentejas con arroz y verduras',
      detail: 'Una opción simple para preparar varias porciones.',
      vegetarian: true,
      dairyFree: true,
      lowCost: true,
    },
    {
      title: 'Omelette con tomate y tostadas',
      detail: 'Huevos, verduras y el pan que tengas.',
      vegetarian: true,
      dairyFree: true,
      lowCost: true,
    },
    {
      title: 'Pollo con boniato y ensalada',
      detail: 'Podés aprovechar pollo que ya tengas cocido.',
      vegetarian: false,
      dairyFree: true,
      lowCost: true,
    },
    {
      title: 'Yogur con avena y fruta',
      detail: 'Elegí el yogur que usás habitualmente.',
      vegetarian: true,
      dairyFree: false,
      lowCost: true,
    },
    {
      title: 'Salmón con arroz y verduras',
      detail: 'Una alternativa para variar la cena.',
      vegetarian: false,
      dairyFree: true,
      lowCost: false,
    },
  ];
  return ideas.filter(
    (i) =>
      (!p.vegetarian || i.vegetarian) &&
      (!p.dairyFree || i.dairyFree) &&
      (p.budget !== 'low' || i.lowCost),
  );
}

/** Compare completed local calendar days, so a half-finished today never depresses the report. */
export function weeklyReport(meals: LoggedMeal[], now = new Date()) {
  const end = new Date(now);
  end.setDate(end.getDate() - 1);
  const days = lastNDayKeys(7, end);
  const previousEnd = new Date(end);
  previousEnd.setDate(previousEnd.getDate() - 7);
  const previousDays = lastNDayKeys(7, previousEnd);
  const valid = meals.filter((m) => Number.isFinite(new Date(m.eatenAt).getTime()));
  const selected = valid.filter((m) => days.includes(dayKey(new Date(m.eatenAt))));
  const logged = new Set(selected.map((m) => dayKey(new Date(m.eatenAt))));
  const previous = new Set(
    valid
      .filter((m) => previousDays.includes(dayKey(new Date(m.eatenAt))))
      .map((m) => dayKey(new Date(m.eatenAt))),
  );
  return {
    days: days.map((date) => ({
      date,
      count: selected.filter((m) => dayKey(new Date(m.eatenAt)) === date).length,
    })),
    loggedDays: logged.size,
    previousLoggedDays: previous.size,
    delta: logged.size - previous.size,
    mealCount: selected.length,
    averageLoggedProtein: logged.size
      ? Math.round(selected.reduce((s, m) => s + Number(m.protein), 0) / logged.size)
      : null,
    caveat:
      'Solo refleja las comidas registradas. Un día sin registros no significa que no comiste.',
    action:
      logged.size < 5
        ? 'La próxima semana, elegí una comida que puedas registrar cada día.'
        : 'La próxima semana, repetí el horario que te resultó más fácil para registrar.',
  };
}
