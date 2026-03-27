import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-brand-500 text-white',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-red-500 text-white',
        outline: 'text-foreground',
        breakfast:
          'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
        lunch:
          'border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        dinner:
          'border-transparent bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
        snack:
          'border-transparent bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

const dotColors: Record<string, string> = {
  breakfast: 'bg-amber-500',
  lunch: 'bg-green-500',
  dinner: 'bg-indigo-500',
  snack: 'bg-pink-500',
}

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, children, ...props }: BadgeProps) {
  const dot = variant ? dotColors[variant] : null
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className={cn('inline-block h-1.5 w-1.5 rounded-full', dot)} />}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
