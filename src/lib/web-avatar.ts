import { AVATAR_PRESETS, DEFAULT_AVATAR_PRESET_ID, webAvatarTokenFromPresetId } from '@/data/avatar-presets'

const STORAGE_KEY = 'imposter-web-avatar-preset'

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
