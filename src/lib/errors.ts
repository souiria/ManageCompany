/** Centralized error handling: converts unknown errors into user-friendly French messages. */

export function toUserMessage(error: unknown): string {
  if (error instanceof Error) {
    // Supabase PostgREST errors carry .code / .message
    const anyErr = error as { code?: string; message?: string };
    if (anyErr.code === '23505') {
      return 'Un enregistrement avec ces références existe déjà (doublon détecté).';
    }
    if (anyErr.code === '23503') {
      return 'Référence invalide : l’enregistrement lié n’existe pas ou est utilisé ailleurs.';
    }
    if (anyErr.code === '42501') {
      return 'Action non autorisée avec votre rôle (politique RLS).';
    }
    if (anyErr.message) return anyErr.message;
  }
  return 'Une erreur inattendue est survenue. Veuillez réessayer.';
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
