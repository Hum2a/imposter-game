import { useState } from 'react'

import { presetEmojiFromAvatarToken } from '@/data/avatar-presets'

export type AvatarSubject = {
  id: string
  name: string
  avatar?: string | null
}

type AvatarProps = {
  user: AvatarSubject
  size?: number
  className?: string
}

/**
 * Discord CDN avatars can fail to load in the Activity iframe (CORS / embedding).
 * Fall back to a Discord-style initial circle.
 */
export function Avatar({ user, size = 40, className = '' }: AvatarProps) {
  const [errored, setErrored] = useState(false)

  const presetEmoji = presetEmojiFromAvatarToken(user.avatar)

  const url =
    user.avatar &&
    !presetEmoji &&
    !errored
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=${Math.min(256, Math.max(64, size * 2))}`
      : null

  const initial = (user.name?.[0] ?? '?').toUpperCase()

  if (presetEmoji) {
    return (
      <div
        className={`grid shrink-0 place-items-center rounded-full bg-primary/15 text-lg leading-none ${className}`}
        style={{ width: size, height: size, fontSize: Math.max(14, size * 0.45) }}
        aria-hidden
      >
        {presetEmoji}
      </div>
    )
  }

  if (!url) {
    return (
      <div
        className={`grid shrink-0 place-items-center rounded-full bg-[#5865F2] font-semibold text-white ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.42 }}
        aria-hidden
      >
        {initial}
      </div>
    )
  }

  return (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 rounded-full object-cover ${className}`}
      onError={() => setErrored(true)}
    />
  )
}
