import { useEffect, useRef } from 'react'

import type { Phase } from '@/types/game'

import { useSfx } from './use-sfx'

/** Plays short cues on phase transitions (muted by default; respects reduced motion). */
export function PhaseSfxListener({ phase }: { phase: Phase }) {
  const { play } = useSfx()
  const prev = useRef<Phase | null>(null)

  useEffect(() => {
    const was = prev.current
    if (was !== null && was !== phase) {
      if (phase === 'discussion' && was === 'lobby') play('round')
      if (phase === 'reveal' && was === 'voting') play('reveal')
    }
    prev.current = phase
  }, [phase, play])

  return null
}
