/**
 * frontend/src/lib/errors.ts
 * ────────────────────────────
 * Shared helper for turning any thrown error (Axios error, network
 * failure, validation error, or plain Error) into a single, accurate,
 * human-readable message.
 *
 * Why this exists:
 * Axios errors ARE `instanceof Error`, so `error.message` always looks
 * "valid" — but it's Axios's own generic text ("Request failed with
 * status code 401"), never the backend's actual `detail` field. Every
 * catch block that did `error instanceof Error ? error.message : ...`
 * was silently showing the wrong message. This is the fix point so the
 * logic lives in one place instead of being copy-pasted (and copy-pasted
 * imperfectly) into every page.
 */

import { isAxiosError } from 'axios';

/** Shape FastAPI returns on HTTPException: { detail: string | object[] } */
interface FastApiErrorBody {
  detail?: string | { msg?: string; loc?: (string | number)[] }[];
}

const NETWORK_ERROR_MESSAGE =
  "Can't reach the server right now. Check your connection and try again.";

const TIMEOUT_MESSAGE = 'The request took too long to respond. Please try again.';

const GENERIC_FALLBACK = 'Something went wrong. Please try again.';

/**
 * Extract the best available human-readable message from any error thrown
 * by an API call.
 */
export function getApiErrorMessage(error: unknown): string {
  if (isAxiosError<FastApiErrorBody>(error)) {
    // No response at all = network/CORS/DNS failure, not a server error.
    if (!error.response) {
      if (error.code === 'ECONNABORTED') return TIMEOUT_MESSAGE;
      return NETWORK_ERROR_MESSAGE;
    }

    const { status, data } = error.response;
    const detail = data?.detail;

    // FastAPI validation errors return detail as an array of {msg, loc}.
    if (Array.isArray(detail) && detail.length > 0) {
      return detail.map((d) => d.msg).filter(Boolean).join(' ') || GENERIC_FALLBACK;
    }

    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }

    // No usable detail field — fall back to a message keyed off status code.
    switch (status) {
      case 400:
        return 'That request was invalid. Please check your input and try again.';
      case 401:
        return 'Invalid email or password.';
      case 403:
        return "You don't have permission to do that.";
      case 404:
        return "We couldn't find what you were looking for.";
      case 409:
        return 'That already exists. Please use a different value.';
      case 422:
        return 'Some fields need attention. Please check the form and try again.';
      case 429:
        return 'Too many attempts. Please wait a moment and try again.';
      case 500:
      case 502:
      case 503:
      case 504:
        return "Our server hit a problem on our end — it's not something you did. Please try again shortly.";
      default:
        return GENERIC_FALLBACK;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return GENERIC_FALLBACK;
}

/** True if the error represents a network failure (no response from server at all). */
export function isNetworkError(error: unknown): boolean {
  return isAxiosError(error) && !error.response;
}
