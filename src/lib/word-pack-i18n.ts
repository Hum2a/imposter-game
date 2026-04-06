import type { TFunction } from 'i18next'

import { WORD_PACK_OPTIONS, labelForWordPackId } from '@/data/word-pack-options'

/** Localized pack name; falls back to `labelForWordPackId` then raw id. */
export function wordPackLabel(id: string | null | undefined, t: TFunction): string {
  const raw = id?.trim()
  if (!raw) return labelForWordPackId('')
  return t(`wordPacks.${raw}`, { defaultValue: labelForWordPackId(raw) })
}

/** Optional subtitle for select options (e.g. Classic). */
export function wordPackHint(id: string, t: TFunction): string | undefined {
  const opt = WORD_PACK_OPTIONS.find((p) => p.id === id)
  const translated = t(`wordPackHints.${id}`, { defaultValue: opt?.hint ?? '' }).trim()
  return translated || undefined
}
