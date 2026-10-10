import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import { clearPendingInviteCode } from '@/features/partner/invite-utils';
import { logger } from '@/lib/logger';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getProfile } from '@/services/auth';
import { registerForPushNotificationsAsync,
  clearCurrentDevicePush, syncLocalReminders } from '@/services/notifications';
import { getAcceptedPartner, getNutritionGoals } from '@/services/partner';
import { useOnboardingStore } from '@/stores/onboarding';
import { useScanDraftStore } from '@/stores/scan-draft';
import type { NutritionGoals, Profile } from '@/types/database';

type AppGate =
  'loading' | 'unauthenticated' | 'needs_onboarding' | 'needs_partner' | 'ready' | 'misconfigured';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  goals: NutritionGoals | null;
  partner: Profile | null;
  gate: AppGate;
  refreshBootstrap: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isQueryBootstrapping(query: {
  isFetched: boolean;
  isFetching: boolean;
  isError: boolean;
}): boolean {
  // Disabled queries report isPending without fetching; once enabled, wait until first result.
  if (!query.isFetched && !query.isError) return true;
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        setSessionLoading(false);
      })
      .catch((error) => {
        logger.warn('getSession failed', {
          message: error instanceof Error ? error.message : 'unknown',
        });
        if (!active) return;
        setSession(null);
        setSessionLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Defer to avoid AsyncStorage auth lock deadlocks on React Native.
      setTimeout(() => {
        if (!active) return;
        setSession(nextSession);
        setSessionLoading(false);
      }, 0);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id;

  const profileQuery = useQuery({
    queryKey: QUERY_KEYS.profile(userId),
    queryFn: () => getProfile(userId!),
    enabled: Boolean(userId) && isSupabaseConfigured,
  });

  const goalsQuery = useQuery({
    queryKey: QUERY_KEYS.goals(userId),
    queryFn: () => getNutritionGoals(userId!),
    enabled: Boolean(userId) && isSupabaseConfigured,
  });

  const partnerQuery = useQuery({
    queryKey: QUERY_KEYS.partner(userId),
    queryFn: async () => {
      const result = await getAcceptedPartner(userId!);
      return result?.partner ?? null;
    },
    enabled: Boolean(userId) && isSupabaseConfigured,
  });

  const gate: AppGate = (() => {
    if (!isSupabaseConfigured) return 'misconfigured';
    if (sessionLoading) return 'loading';
    if (!session) return 'unauthenticated';

    if (
      isQueryBootstrapping(profileQuery) ||
      isQueryBootstrapping(goalsQuery) ||
      isQueryBootstrapping(partnerQuery)
    ) {
      return 'loading';
    }

    const profile = profileQuery.data;
    if (!profile || !profile.onboarding_completed || !goalsQuery.data) {
      return 'needs_onboarding';
    }

    return 'ready';
  })();

  useEffect(() => {
    // Sync token only if permission was already granted — never prompt on launch.
    if (gate !== 'ready' || !userId) return;
    registerForPushNotificationsAsync(userId, { requestPermission: false }).catch(() => {
      // Push sync is best-effort.
    });
  }, [gate, userId]);

  useEffect(() => {
    if (gate !== 'ready' || !userId) return;
    void syncLocalReminders(userId, profileQuery.data ?? undefined).catch(() =>
      logger.warn('Local reminders unavailable'),
    );
  }, [
    gate,
    userId,
    profileQuery.data?.notif_reminders,
    profileQuery.data?.notif_progress,
    profileQuery.data,
  ]);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile: profileQuery.data ?? null,
    goals: goalsQuery.data ?? null,
    partner: partnerQuery.data ?? null,
    gate,
    refreshBootstrap: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile(userId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.goals(userId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.partner(userId) }),
      ]);
    },
    signOut: async () => {
      if (userId) await clearCurrentDevicePush(userId).catch(() => undefined);
      void syncLocalReminders(null).catch(() => undefined);
      // Clear UI/session first so guarded layouts redirect immediately.
      setSession(null);
      setSessionLoading(false);
      queryClient.clear();
      useOnboardingStore.getState().reset();
      useScanDraftStore.getState().reset();
      await clearPendingInviteCode().catch(() => undefined);

      try {
        // `local` avoids hanging on network and reduces AsyncStorage lock contention.
        // Without this, a stuck signOut can block the next signIn forever.
        await Promise.race([
          supabase.auth.signOut({ scope: 'local' }),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('signOut timeout')), 2500);
          }),
        ]);
      } catch (error) {
        logger.warn('signOut local issue', {
          message: error instanceof Error ? error.message : 'unknown',
        });
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
