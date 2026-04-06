import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type GameScreenProps = {
  children: ReactNode
  className?: string
}

/** Consistent max width and spacing for lobby / play / vote / reveal. */
export function GameScreen({ children, className }: GameScreenProps) {
  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-lg flex-col gap-6 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] motion-reduce:transition-none md:gap-8 md:pb-10 md:pt-10 lg:max-w-3xl xl:max-w-4xl',
        className
      )}
    >
      {children}
    </div>
  )
}
