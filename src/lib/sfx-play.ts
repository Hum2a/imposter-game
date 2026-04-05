export type SfxId = 'vote' | 'round' | 'reveal'

const URLS: Record<SfxId, string> = {
  vote: '/sounds/vote.wav',
  round: '/sounds/round.wav',
  reveal: '/sounds/reveal.wav',
}

const cache: Partial<Record<SfxId, HTMLAudioElement>> = {}

function getAudio(id: SfxId): HTMLAudioElement {
  let a = cache[id]
  if (!a) {
    a = new Audio(URLS[id])
    a.preload = 'auto'
    a.volume = 0.42
    cache[id] = a
  }
  return a
}

/** Fire-and-forget; ignores play() rejection (autoplay policies). */
export function playSfx(id: SfxId): void {
  const a = getAudio(id)
  a.currentTime = 0
  void a.play().catch(() => {})
}
