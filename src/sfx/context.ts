import { createContext } from 'react'

import type { SfxId } from '@/lib/sfx-play'

export type SfxContextValue = {
  sfxEnabled: boolean
  setSfxEnabled: (v: boolean) => void
  reducedMotion: boolean
  play: (id: SfxId) => void
}

export const SfxContext = createContext<SfxContextValue | null>(null)
