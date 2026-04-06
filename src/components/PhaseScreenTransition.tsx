import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type TransitionEvent,
} from 'react'

import type { Phase } from '@/types/game'
import { cn } from '@/lib/utils'

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

type PhaseScreenTransitionProps = {
  phase: Phase
  children: (phase: Phase) => ReactNode
}

/**
 * Cross-fades between phase screens (lobby ↔ play). Respects reduced motion.
 */
export function PhaseScreenTransition({ phase, children }: PhaseScreenTransitionProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [displayed, setDisplayed] = useState(phase)
  const [status, setStatus] = useState<'shown' | 'hiding' | 'showing'>('shown')
  const targetPhase = useRef(phase)

  useEffect(() => {
    targetPhase.current = phase
  }, [phase])

  useEffect(() => {
    if (phase === displayed) return
    if (prefersReducedMotion) {
      setDisplayed(phase)
      setStatus('shown')
      return
    }
    setStatus('hiding')
  }, [phase, displayed, prefersReducedMotion])

  useLayoutEffect(() => {
    if (status !== 'showing') return
    const id = requestAnimationFrame(() => setStatus('shown'))
    return () => cancelAnimationFrame(id)
  }, [status, displayed])

  const onOpacityTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || e.propertyName !== 'opacity') return
    if (status !== 'hiding') return
    setDisplayed(targetPhase.current)
    setStatus('showing')
  }

  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col motion-safe:transition-opacity motion-safe:duration-300 motion-safe:ease-out',
        status === 'hiding' && 'opacity-0',
        status === 'showing' && 'opacity-0',
        status === 'shown' && 'opacity-100'
      )}
      onTransitionEnd={onOpacityTransitionEnd}
    >
      {children(displayed)}
    </div>
  )
}
