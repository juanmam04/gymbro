import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_INVITE_KEY = 'gymbro.pending_invite_code';

export async function savePendingInviteCode(code: string): Promise<void> {
  await AsyncStorage.setItem(PENDING_INVITE_KEY, code.trim().toUpperCase());
}

export async function getPendingInviteCode(): Promise<string | null> {
  const value = await AsyncStorage.getItem(PENDING_INVITE_KEY);
  return value?.trim() ? value.trim().toUpperCase() : null;
}

export async function clearPendingInviteCode(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_INVITE_KEY);
}

export function buildInviteDeepLink(code: string): string {
  return `gymbro://join/${code.trim().toUpperCase()}`;
}

export function buildInviteShareMessage(code: string, inviterName?: string): string {
  const link = buildInviteDeepLink(code);
  const who = inviterName?.trim() ? `${inviterName.trim()} ` : '';
  return (
    `Sumate a GymBro conmigo 💪\n` +
    `${who}Usá mi invitación para conectar nuestras comidas y progreso:\n` +
    `${link}\n\n` +
    `Código: ${code.trim().toUpperCase()}`
  );
}
