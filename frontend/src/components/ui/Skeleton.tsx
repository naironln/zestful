import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export default function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-warm-gray-200 dark:bg-warm-gray-800',
        className
      )}
    />
  )
}

export function MealCardSkeleton() {
  return (
    <div className="flex gap-4 rounded-xl border bg-card p-4">
      <Skeleton className="h-20 w-20 shrink-0 rounded-xl" />
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-1.5 h-3 w-48" />
        </div>
        <Skeleton className="mt-2 h-5 w-20 rounded-full" />
      </div>
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4">
      <Skeleton className="h-8 w-12" />
      <Skeleton className="mt-2 h-3 w-20" />
    </div>
  )
}
