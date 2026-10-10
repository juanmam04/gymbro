import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { PurchasesPackage } from 'react-native-purchases';

export interface AccessStatus {
  plan: 'free' | 'plus' | 'duo';
  remaining: number;
  limit: number;
  period: string;
}
let configuredUser: string | null = null;
export const billingAvailable =
  Constants.appOwnership !== 'expo' &&
  Platform.OS !== 'web' &&
  Boolean(
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  );
async function sdk(userId: string) {
  if (!billingAvailable)
    throw new Error(
      'Las compras necesitan la versión de Racha instalada desde la tienda o un development build con RevenueCat configurado.',
    );
  const { default: Purchases } = await import('react-native-purchases');
  if (!configuredUser) {
    Purchases.configure({
      apiKey: (Platform.OS === 'ios'
        ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
        : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY)!,
      appUserID: userId,
    });
  } else if (configuredUser !== userId) await Purchases.logIn(userId);
  configuredUser = userId;
  return Purchases;
}
export async function offerings(userId: string) {
  const purchases = await sdk(userId);
  return (await purchases.getOfferings()).current?.availablePackages ?? [];
}
export async function syncSubscription() {
  const { error } = await supabase.functions.invoke('sync-subscription');
  if (error)
    throw new Error(
      'Tu compra está registrada en la tienda, pero aún no pudimos actualizar el acceso. Probá restaurar compras.',
    );
}
export async function purchase(userId: string, pack: PurchasesPackage) {
  const purchases = await sdk(userId);
  await purchases.purchasePackage(pack);
  await syncSubscription();
}
export async function restore(userId: string) {
  const purchases = await sdk(userId);
  await purchases.restorePurchases();
  await syncSubscription();
}
export async function fetchAccess(): Promise<AccessStatus> {
  const { data, error } = await supabase.rpc('get_racha_access');
  if (error) throw new Error('No pudimos consultar tu plan. Probá de nuevo.');
  return data as AccessStatus;
}
