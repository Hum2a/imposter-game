/** True when the app is likely running inside Discord’s Activity iframe. */
export function isDiscordActivity(): boolean {
  if (typeof window === 'undefined') return false
  const q = new URLSearchParams(window.location.search)
  if (q.has('frame_id')) return true
  return /discord/i.test(navigator.userAgent)
}
