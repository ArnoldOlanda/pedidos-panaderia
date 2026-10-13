import { toast as sonnerToast } from 'sonner';
import { toApiError } from './api';

/**
 * Thin Spanish-language wrapper around sonner.
 *
 * All user-facing copy lives here so that:
 * - mutations stay short (no inline Spanish strings in every hook),
 * - error copy is consistent (every error toast is normalized through
 *   `toApiError`, which already handles axios / non-axios errors), and
 * - future copy changes happen in one place.
 *
 * For form-level errors (e.g. login), keep an inline `<Alert>` near the
 * input; toasts are for transient action feedback.
 */

export interface ErrorOptions {
  /** Used when the error has no usable message (network down, unknown shape). */
  fallback: string;
  /** Optional secondary line, e.g. "DNI o nombre inválido". */
  hint?: string;
}

export interface PromiseMessages<T> {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((err: unknown) => string);
}

function buildErrorDescription(err: unknown, options: ErrorOptions): string {
  const apiErr = toApiError(err);
  const base = apiErr.message?.trim() ? apiErr.message : options.fallback;
  return options.hint ? `${base} — ${options.hint}` : base;
}

export const toast = {
  success(message: string): void {
    sonnerToast.success(message);
  },

  error(err: unknown, options: ErrorOptions): void {
    sonnerToast.error(buildErrorDescription(err, options));
  },

  warning(message: string): void {
    sonnerToast.warning(message);
  },

  info(message: string): void {
    sonnerToast.info(message);
  },

  /**
   * sonner-style promise toast. Use it when the caller wants a single
   * declarative binding instead of two separate `onSuccess`/`onError`
   * callbacks (e.g. inside a one-off action button).
   */
  promise<T>(fn: Promise<T>, messages: PromiseMessages<T>): Promise<T> {
    sonnerToast.promise(fn, {
      loading: messages.loading,
      success: (data: T) =>
        typeof messages.success === 'function'
          ? messages.success(data)
          : messages.success,
      // sonner's signature is (err) => ReactNode; we forward whatever
      // the caller already translated, so no normalization here.
      error: (err: unknown) =>
        typeof messages.error === 'function'
          ? messages.error(err)
          : messages.error,
    });
    return fn;
  },
};
