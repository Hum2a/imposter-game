import { useState } from 'react'

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

  const url =
    user.avatar && !errored
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=${Math.min(256, Math.max(64, size * 2))}`
      : null

  const initial = (user.name?.[0] ?? '?').toUpperCase()

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
