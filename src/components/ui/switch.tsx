import * as React from 'react'

import { cn } from '@/lib/utils'

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'role'> {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked, onCheckedChange, disabled, ...props }, ref) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      ref={ref}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange(!checked)}
      className={cn(
        'peer relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full p-0.5',
        'transition-[background-color,box-shadow] duration-200 motion-reduce:transition-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-40',
        checked
          ? 'bg-primary shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.14)]'
          : 'bg-muted/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] ring-1 ring-border/60 dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]',
        className
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none block size-7 rounded-full shadow-md transition-transform duration-200 motion-reduce:transition-none',
          checked
            ? 'translate-x-6 bg-primary-foreground'
            : 'translate-x-0 bg-background ring-1 ring-border/50 dark:bg-card'
        )}
      />
    </button>
  )
)
Switch.displayName = 'Switch'

export { Switch }
