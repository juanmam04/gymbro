export function getHumanErrorMessage(
  error: unknown,
  fallback = 'Algo salió mal. Intentá de nuevo.',
): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String((error as { message: unknown }).message)
        : typeof error === 'string'
          ? error
          : '';

  const message = raw.toLowerCase();

  if (!message) return fallback;

  if (message.includes('network') || message.includes('fetch') || message.includes('failed to connect')) {
    return 'Revisá tu conexión e intentá nuevamente.';
  }
  if (message.includes('jwt') || message.includes('session') || message.includes('not authenticated')) {
    return 'Tu sesión expiró. Volvé a iniciar sesión.';
  }
  if (message.includes('invite') || message.includes('código') || message.includes('invalid invite')) {
    return 'Ese código ya no es válido.';
  }
  if (message.includes('already connected')) {
    return 'Ya estás conectado con alguien.';
  }
  if (message.includes('row-level security') || message.includes('rls') || message.includes('42501')) {
    return 'No tenés permiso para hacer eso.';
  }
  if (message.includes('23505') || message.includes('duplicate')) {
    return 'Eso ya existe.';
  }
  if (message.includes('coerce') || message.includes('single json') || message.includes('0 rows')) {
    return 'No encontramos ese dato. Intentá de nuevo.';
  }
  if (message.includes('storage') || message.includes('upload')) {
    return 'No pudimos subir la imagen. Intentá de nuevo.';
  }

  if (
    message.includes('postgrest') ||
    message.includes('pgrst') ||
    message.includes('postgres') ||
    /error code/i.test(raw)
  ) {
    return fallback;
  }

  if (raw.length > 120) return fallback;
  return raw || fallback;
}

export function getErrorMessage(error: unknown, fallback?: string): string {
  return getHumanErrorMessage(error, fallback);
}
