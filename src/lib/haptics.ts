/** Short tap for vote confirm; skipped when reduced-motion is preferred. */
export function lightVoteHaptic(): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  } catch {
    /* ignore */
  }
  navigator.vibrate(12)
}
