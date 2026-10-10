import { MutationCache, QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: () => {
      for (const key of [
        'mealsSince',
        'weeklyReport',
        'coachMeals',
        'challengeMeals',
        'partnerStreak',
      ]) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
