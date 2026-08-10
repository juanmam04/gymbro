import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Subscribes to meals, reactions and comments for feed user ids
 * and invalidates the feed query on changes.
 */
export function useFeedRealtime(userIds: string[]) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const viewerId = user?.id;
  const idsKey = userIds.slice().sort().join(',');

  useEffect(() => {
    if (!viewerId || userIds.length === 0) return;

    const invalidateFeed = () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed(viewerId) });
    };

    const channel = supabase.channel(`feed:${viewerId}:${idsKey}`);

    for (const userId of userIds) {
      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'meals', filter: `user_id=eq.${userId}` },
          invalidateFeed,
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'meal_reactions',
            filter: `user_id=eq.${userId}`,
          },
          invalidateFeed,
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'meal_comments',
            filter: `user_id=eq.${userId}`,
          },
          invalidateFeed,
        );
    }

    // Reactions/comments from other users on our meals
    channel
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
  }, [viewerId, idsKey, queryClient, userIds]);
}
