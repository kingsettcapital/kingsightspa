/** Extract a user-facing message from an HttpClient error (API `{ message, detail, inner }` or plain string). */
export function extractApiError(
  error: unknown,
  fallback = 'Unable to load data. Verify API availability.',
): string {
  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const maybeError = error as {
    error?: { message?: string; detail?: string; inner?: string } | string;
    message?: string;
  };

  if (typeof maybeError.error === 'string' && maybeError.error.trim()) {
    return maybeError.error.trim();
  }

  if (maybeError.error && typeof maybeError.error === 'object') {
    const detail = maybeError.error.detail?.trim();
    const inner = maybeError.error.inner?.trim();
    const message = maybeError.error.message?.trim();
    if (detail && inner) {
      return `${detail} (${inner})`;
    }
    if (detail) {
      return detail;
    }
    if (message) {
      return message;
    }
  }

  if (typeof maybeError.message === 'string' && maybeError.message.trim()) {
    return maybeError.message.trim();
  }

  return fallback;
}
