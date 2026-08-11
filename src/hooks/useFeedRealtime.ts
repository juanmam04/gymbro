import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Subscribes to meals, reactions and comments for feed user ids
 * and invalidates the feed query on changes.
 *
 * All `.on()` handlers must be registered before `.subscribe()`.
 * Channel names are unique per effect run so React Strict Mode /
 * fast remounts never attach callbacks to an already-subscribed channel.
 */
export function useFeedRealtime(userIds: string[]) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const viewerId = user?.id;
  const idsKey = userIds.slice().sort().join(',');

  useEffect(() => {
    if (!viewerId || !idsKey) return;

    const invalidateFeed = () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed(viewerId) });
    };

    const sortedIds = idsKey.split(',').filter(Boolean);
    const mealsFilter =
      sortedIds.length === 1
        ? `user_id=eq.${sortedIds[0]}`
        : `user_id=in.(${sortedIds.join(',')})`;

    const channel = supabase
      .channel(`feed:${viewerId}:${idsKey}:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meals', filter: mealsFilter },
        invalidateFeed,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meal_reactions' },
        invalidateFeed,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meal_comments' },
        invalidateFeed,
      );

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [viewerId, idsKey, queryClient]);
}
