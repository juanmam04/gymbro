import { createLocalId } from '@/utils/nutrition';
import { supabase } from '@/lib/supabase';
import { createMeal, mealItemsToEditable } from '@/services/meals';
import type { EditableFoodItem } from '@/types/nutrition';
import type { SharedMealInvite } from '@/types/database';

export async function createSharedMealInvite(input: {
  sourceMealId: string;
  senderId: string;
  recipientId: string;
}): Promise<SharedMealInvite> {
  const { data, error } = await supabase
    .from('shared_meal_invites')
    .insert({
      source_meal_id: input.sourceMealId,
      sender_id: input.senderId,
      recipient_id: input.recipientId,
      status: 'pending',
    })
    .select('*')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('No se pudo compartir la comida');
  return data;
}

export async function fetchPendingSharedInvites(userId: string): Promise<SharedMealInvite[]> {
  const { data, error } = await supabase
    .from('shared_meal_invites')
    .select(
      `
      *,
      source_meal:meals!shared_meal_invites_source_meal_id_fkey (*),
      sender:profiles!shared_meal_invites_sender_id_fkey (id, display_name, avatar_url)
    `,
    )
    .eq('recipient_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as SharedMealInvite[];
}

export async function declineSharedMealInvite(inviteId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('shared_meal_invites')
    .update({ status: 'declined', responded_at: new Date().toISOString() })
    .eq('id', inviteId)
    .eq('recipient_id', userId);
  if (error) throw error;
}

export async function acceptSharedMealSamePortion(input: {
  inviteId: string;
  userId: string;
}): Promise<string> {
  const { data: invite, error } = await supabase
    .from('shared_meal_invites')
    .select('*, source_meal:meals!shared_meal_invites_source_meal_id_fkey (*, meal_items (*))')
    .eq('id', input.inviteId)
    .eq('recipient_id', input.userId)
    .eq('status', 'pending')
    .maybeSingle();

  if (error) throw error;
  if (!invite?.source_meal) throw new Error('Invitación no válida');

  const source = invite.source_meal as {
    image_url: string | null;
    meal_type: string;
    meal_items: Parameters<typeof mealItemsToEditable>[0];
    id: string;
  };

  const items = mealItemsToEditable(source.meal_items).map((item) => ({
    ...item,
    localId: createLocalId(),
    source: 'manual' as const,
  }));

  const groupId = createLocalId();

  const meal = await createMeal({
    userId: input.userId,
    imageUrl: source.image_url,
    items,
    mealType: source.meal_type as never,
    sharedWithPartner: true,
    sharedGroupId: groupId,
    scanStatus: 'edited',
  });

  // Mark source as shared too
  await supabase
    .from('meals')
    .update({ shared_with_partner: true, shared_group_id: groupId })
    .eq('id', source.id);

  await supabase
    .from('shared_meal_invites')
    .update({
      status: 'accepted',
      responded_at: new Date().toISOString(),
      resulting_meal_id: meal.id,
    })
    .eq('id', input.inviteId);

  return meal.id;
}

export async function acceptSharedMealEdited(input: {
  inviteId: string;
  userId: string;
  items: EditableFoodItem[];
  mealType?: string;
}): Promise<string> {
  const { data: invite, error } = await supabase
    .from('shared_meal_invites')
    .select('*, source_meal:meals!shared_meal_invites_source_meal_id_fkey (*)')
    .eq('id', input.inviteId)
    .eq('recipient_id', input.userId)
    .eq('status', 'pending')
    .maybeSingle();

  if (error) throw error;
  if (!invite?.source_meal) throw new Error('Invitación no válida');

  const source = invite.source_meal as {
    id: string;
    image_url: string | null;
    meal_type: string;
  };

  const groupId = createLocalId();
  const meal = await createMeal({
    userId: input.userId,
    imageUrl: source.image_url,
    items: input.items,
    mealType: (input.mealType as never) ?? (source.meal_type as never),
    sharedWithPartner: true,
    sharedGroupId: groupId,
  });

  await supabase
    .from('meals')
    .update({ shared_with_partner: true, shared_group_id: groupId })
    .eq('id', source.id);

  await supabase
    .from('shared_meal_invites')
    .update({
      status: 'accepted',
      responded_at: new Date().toISOString(),
      resulting_meal_id: meal.id,
    })
    .eq('id', input.inviteId);

  return meal.id;
}
