import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * Deletes the authenticated account via Edge Function `delete-account`.
 * Requires the function to be deployed with service role secrets on Supabase.
 */
export async function deleteAccount(): Promise<void> {
  const { data, error } = await supabase.functions.invoke('delete-account', {
    method: 'POST',
    body: {},
  });

  if (error) {
    let detail = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const body = await error.context.json();
        if (body && typeof body === 'object' && 'error' in body) {
          detail = String((body as { error: unknown }).error);
        }
      } catch {
        // keep original message
      }
    }
    logger.warn('deleteAccount failed', { detail });
    throw new Error(
      detail.includes('Failed to send') || detail.includes('Function not found')
        ? 'La eliminación de cuenta no está disponible todavía. Falta desplegar la Edge Function delete-account.'
        : detail || 'No se pudo eliminar la cuenta.',
    );
  }

  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(String((data as { error: unknown }).error));
  }
}
