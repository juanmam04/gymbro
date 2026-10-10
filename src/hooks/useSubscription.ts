import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { fetchAccess } from '@/services/subscription';
export function useSubscription() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: fetchAccess,
    enabled: Boolean(user),
    staleTime: 30_000,
  });
}
