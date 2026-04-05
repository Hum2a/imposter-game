import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { playSfx, type SfxId } from '@/lib/sfx-play'

import { SfxContext } from './context'

const STORAGE_KEY = 'imposter_sfx_enabled'

function readSfxEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeSfxEnabled(v: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, v ? '1' : '0')
  } catch {
    /* private mode / quota */
  }
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return reduced
}

export function SfxProvider({ children }: { children: ReactNode }) {
  const [sfxEnabled, setSfxEnabledState] = useState(readSfxEnabled)
  const reducedMotion = usePrefersReducedMotion()

  const setSfxEnabled = useCallback((v: boolean) => {
    setSfxEnabledState(v)
    writeSfxEnabled(v)
  }, [])

  const play = useCallback(
    (id: SfxId) => {
      if (!sfxEnabled || reducedMotion) return
      playSfx(id)
    },
    [sfxEnabled, reducedMotion]
  )

  const value = useMemo(
    () => ({ sfxEnabled, setSfxEnabled, reducedMotion, play }),
    [sfxEnabled, setSfxEnabled, reducedMotion, play]
  )

  return <SfxContext.Provider value={value}>{children}</SfxContext.Provider>
}
