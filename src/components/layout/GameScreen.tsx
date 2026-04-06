import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type GameScreenProps = {
  children: ReactNode
  className?: string
}

/** Full-width landscape layout; horizontal padding scales with viewport. */
export function GameScreen({ children, className }: GameScreenProps) {
  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-none flex-col gap-6 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] motion-reduce:transition-none sm:px-6 md:gap-8 md:pb-10 md:pt-10 lg:px-10 xl:px-14 2xl:px-20',
        className
      )}
    >
      {children}
    </div>
  )
}
