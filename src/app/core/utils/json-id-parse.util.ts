/**
 * JavaScript JSON.parse coerces large numeric IDs into IEEE-754 doubles and loses
 * precision (e.g. snowflake IDs). Quote those fields in the raw JSON text first.
 */
export function parseJsonPreservingLongIds<T>(json: string, idKeys: readonly string[]): T {
  let patched = json;

  for (const key of idKeys) {
    patched = patched.replace(
      new RegExp(`"${key}"\\s*:\\s*(\\d+)`, 'g'),
      `"${key}":"$1"`,
    );
  }

  return JSON.parse(patched) as T;
}

export const TEMPLATE_ID_JSON_KEYS = ['templateId'] as const;
