import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { LoadingState } from '@/components/ui/LoadingState';
import { savePendingInviteCode } from '@/features/partner/invite-utils';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Deep link handler: gymbro://join/J7K4P2 → /join/J7K4P2
 */
export default function JoinDeepLinkScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { gate, partner } = useAuth();
  const [ready, setReady] = useState(false);
  const normalized = (code ?? '').trim().toUpperCase();

  useEffect(() => {
    let active = true;
    (async () => {
      if (normalized.length === 6) {
        await savePendingInviteCode(normalized);
      }
      if (active) setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [normalized]);

  if (!ready || gate === 'loading') {
    return <LoadingState message="Abriendo invitación…" />;
  }

  if (partner) {
    return <Redirect href="/(tabs)" />;
  }

  if (gate === 'ready') {
    return <Redirect href={`/partner/join?code=${normalized}`} />;
  }

  if (gate === 'needs_onboarding') {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  if (gate === 'unauthenticated' || gate === 'misconfigured') {
    return <Redirect href="/(auth)/register" />;
  }

  return <Redirect href="/" />;
}
