import type { WriteResponse } from '../types';

/** Locked API contract: write endpoints return HTTP 200 even on failure. */
export function isWriteSuccess(body: WriteResponse | null | undefined): boolean {
  if (!body) return false;
  return body.error == null && body.errors == null;
}

/**
 * Friendliest available error text, or null when successful.
 * empty errors string is failure with null display (callers use a generic message).
 */
export function getDisplayError(body: WriteResponse | null | undefined): string | null {
  if (!body) return 'Request failed';
  if (body.errors != null && body.errors !== '') return body.errors;
  if (body.error != null) {
    return body.message != null && body.message !== '' ? body.message : body.error;
  }
  return null;
}
