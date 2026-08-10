import { supabase } from '@/lib/supabase';
import type { WaterEntry } from '@/types/database';
import { dayKey } from '@/features/streaks/calculateStreaks';

export async function addWaterEntry(userId: string, amountMl: number): Promise<WaterEntry> {
  const { data, error } = await supabase
    .from('water_entries')
    .insert({
      user_id: userId,
      amount_ml: amountMl,
      consumed_at: new Date().toISOString(),
    })
    .select('*')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('No se pudo registrar el agua');
  return data;
}

export async function fetchTodayWaterMl(userId: string): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('water_entries')
    .select('amount_ml')
    .eq('user_id', userId)
    .gte('consumed_at', start.toISOString());

  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + Number(row.amount_ml), 0);
}

export async function fetchWaterSince(userId: string, sinceIso: string): Promise<WaterEntry[]> {
  const { data, error } = await supabase
    .from('water_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('consumed_at', sinceIso)
    .order('consumed_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export function waterByDayMap(entries: WaterEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of entries) {
    const key = dayKey(new Date(entry.consumed_at));
    map.set(key, (map.get(key) ?? 0) + entry.amount_ml);
  }
  return map;
}
