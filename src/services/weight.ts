import { supabase } from '@/lib/supabase';
import type { WeightEntry } from '@/types/database';

export async function addWeightEntry(userId: string, weightKg: number): Promise<WeightEntry> {
  const { data, error } = await supabase
    .from('weight_entries')
    .insert({
      user_id: userId,
      weight_kg: weightKg,
      measured_at: new Date().toISOString(),
    })
    .select('*')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('No se pudo guardar el peso');

  await supabase.from('profiles').update({ weight_kg: weightKg }).eq('id', userId);
  return data;
}

export async function fetchLatestWeight(userId: string): Promise<WeightEntry | null> {
  const { data, error } = await supabase
    .from('weight_entries')
    .select('*')
    .eq('user_id', userId)
    .order('measured_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchWeightHistory(userId: string, sinceIso: string): Promise<WeightEntry[]> {
  const { data, error } = await supabase
    .from('weight_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('measured_at', sinceIso)
    .order('measured_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}
