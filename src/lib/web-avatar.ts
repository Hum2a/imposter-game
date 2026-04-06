import { AVATAR_PRESETS, DEFAULT_AVATAR_PRESET_ID, webAvatarTokenFromPresetId } from '@/data/avatar-presets'

const STORAGE_KEY = 'imposter-web-avatar-preset'
const SOURCE_KEY = 'imposter-web-avatar-source'

export type WebAvatarSource = 'preset' | 'provider'

/** Whether the player chose emoji presets or their Discord profile image (web + Supabase Discord). */
export function readWebAvatarSource(): WebAvatarSource {
  try {
    if (localStorage.getItem(SOURCE_KEY) === 'provider') return 'provider'
  } catch {
    /* */
  }
  return 'preset'
}

export function writeWebAvatarSource(source: WebAvatarSource): void {
  try {
    localStorage.setItem(SOURCE_KEY, source)
  } catch {
    /* */
  }
}

export function readWebAvatarPresetId(): string {
  try {
    const v = localStorage.getItem(STORAGE_KEY)?.trim()
    if (v && AVATAR_PRESETS.some((p) => p.id === v)) return v
  } catch {
    /* private mode */
  }
  return DEFAULT_AVATAR_PRESET_ID
}

export function writeWebAvatarPresetId(id: string): void {
  if (!AVATAR_PRESETS.some((p) => p.id === id)) return
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    /* */
  }
}

/** Value for `DiscordAuthSession.user.avatar` when using a preset. */
export function webAvatarTokenForStoredPreset(): string {
  return webAvatarTokenFromPresetId(readWebAvatarPresetId())
}
