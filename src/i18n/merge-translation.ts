/** Deep-merge locale overrides onto the English base (missing keys stay English). */
export function mergeTranslation<T extends Record<string, unknown>>(
  base: T,
  overrides: Partial<{ [K in keyof T]: unknown }>
): T {
  const out = { ...base } as Record<string, unknown>
  for (const key of Object.keys(overrides)) {
    const b = base[key as keyof T]
    const o = overrides[key as keyof T]
    if (
      o !== undefined &&
      o !== null &&
      typeof o === 'object' &&
      !Array.isArray(o) &&
      b !== null &&
      typeof b === 'object' &&
      !Array.isArray(b)
    ) {
      out[key] = mergeTranslation(b as Record<string, unknown>, o as Record<string, unknown>)
    } else if (o !== undefined) {
      out[key] = o
    }
  }
  return out as T
}
