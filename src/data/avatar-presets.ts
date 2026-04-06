/** Curated emoji avatars (web / guest). Stored on the wire as `p:${id}`. */
export type AvatarPreset = { id: string; emoji: string }

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'tomato', emoji: '🍅' },
  { id: 'fox', emoji: '🦊' },
  { id: 'robot', emoji: '🤖' },
  { id: 'alien', emoji: '👽' },
  { id: 'ghost', emoji: '👻' },
  { id: 'wizard', emoji: '🧙' },
  { id: 'ninja', emoji: '🥷' },
  { id: 'detective', emoji: '🕵️' },
  { id: 'crown', emoji: '👑' },
  { id: 'rocket', emoji: '🚀' },
  { id: 'moon', emoji: '🌙' },
  { id: 'star', emoji: '⭐' },
]

export const DEFAULT_AVATAR_PRESET_ID = AVATAR_PRESETS[0]!.id

export function getAvatarPresetById(id: string): AvatarPreset | undefined {
  return AVATAR_PRESETS.find((p) => p.id === id)
}

/** `p:fox` → preset or undefined if not a preset token. */
export function presetEmojiFromAvatarToken(avatar: string | null | undefined): string | null {
  if (!avatar?.startsWith('p:')) return null
  const id = avatar.slice(2)
  return getAvatarPresetById(id)?.emoji ?? null
}

export function webAvatarTokenFromPresetId(id: string): string {
  return `p:${id}`
}
