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
        'mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8 md:gap-8 md:py-10',
        className
      )}
    >
      {children}
    </div>
  )
}
