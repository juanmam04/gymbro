import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import type { DevicePlatform } from '@/types/database';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let currentDeviceToken: string | null = null;

export type PushRegistrationResult =
  { status: 'granted'; token: string } | { status: 'denied' } | { status: 'unavailable' };

/**
 * Registers Expo push token.
 * By default does NOT prompt — only syncs if permission already granted.
 * Pass requestPermission: true when the user explicitly enables notifications.
 */
export async function registerForPushNotificationsAsync(
  userId: string,
  options?: { requestPermission?: boolean },
): Promise<PushRegistrationResult> {
  if (!Device.isDevice) {
    return { status: 'unavailable' };
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    if (!options?.requestPermission) {
      return { status: 'denied' };
    }
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return { status: 'denied' };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('meals', {
      name: 'Comidas',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId || projectId === 'your-eas-project-id') {
      logger.warn('Push skipped: EAS projectId missing. Run eas init first.');
      return { status: 'unavailable' };
    }

    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResult.data;
    currentDeviceToken = token;
    const platform: DevicePlatform = Platform.OS === 'ios' ? 'ios' : 'android';

    const { error } = await supabase.from('device_tokens').upsert(
      {
        user_id: userId,
        expo_push_token: token,
        platform,
      },
      { onConflict: 'expo_push_token' },
    );

    if (error) {
      logger.warn('Failed to save push token', { message: error.message });
    }

    return { status: 'granted', token };
  } catch (error) {
    logger.warn('Push token registration failed', {
      message: error instanceof Error ? error.message : 'unknown',
    });
    return { status: 'unavailable' };
  }
}

export async function clearLocalPushRegistration(userId: string, token?: string | null) {
  if (!token) {
    await supabase.from('device_tokens').delete().eq('user_id', userId);
    return;
  }
  await supabase.from('device_tokens').delete().eq('expo_push_token', token);
}

let reminderQueue: Promise<void> = Promise.resolve();
/** Reconcile opt-in local reminders without prompting for permission on launch. */
export function syncLocalReminders(
  userId: string | null,
  preferences?: { notif_reminders: boolean; notif_progress: boolean },
) {
  reminderQueue = reminderQueue
    .catch(() => undefined)
    .then(async () => {
      if (Platform.OS === 'web') return;
      const existing = await Notifications.getAllScheduledNotificationsAsync();
      for (const notification of existing) {
        if (notification.content.data?.rachaReminder)
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
      if (
        !userId ||
        !preferences ||
        (await Notifications.getPermissionsAsync()).status !== 'granted'
      )
        return;
      if (Platform.OS === 'android')
        await Notifications.setNotificationChannelAsync('habits', {
          name: 'Hábitos',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      if (preferences.notif_reminders)
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Un registro suma',
            body: 'Si querés, registrá una comida de hoy. Un día a la vez.',
            data: { rachaReminder: true, screen: 'home', userId },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 19,
            minute: 30,
            channelId: 'habits',
          },
        });
      if (preferences.notif_progress)
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Una mirada a tu semana',
            body: 'Revisá tus registros y elegí un paso para la próxima semana.',
            data: { rachaReminder: true, screen: 'progress', userId },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: 1,
            hour: 20,
            minute: 0,
            channelId: 'habits',
          },
        });
    });
  return reminderQueue;
}

export async function clearCurrentDevicePush(userId: string) {
  if (!currentDeviceToken) return;
  const token = currentDeviceToken; currentDeviceToken = null;
  const { error } = await supabase.from('device_tokens').delete().eq('user_id', userId).eq('expo_push_token', token);
  if (error) logger.warn('Could not clear current device push');
}
