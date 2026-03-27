import type { LucideIcon } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center py-12 text-center', className)}>
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-950/30">
        <Icon className="h-8 w-8 text-brand-400 dark:text-brand-500" />
      </div>
      <h3 className="font-heading text-lg font-semibold text-warm-gray-900 dark:text-warm-gray-100">
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-warm-gray-500 dark:text-warm-gray-400">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-4" size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
