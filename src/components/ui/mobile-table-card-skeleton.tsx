import { Skeleton } from "@/components/ui/skeleton"

export function MobileTableCardSkeleton({ count = 4 }: { count?: number }) {
  return Array.from({ length: count }, (_, index) => (
    <article key={index} className="flex min-w-0 flex-col gap-3 rounded-md border border-sidebar-border bg-background p-3 dark:bg-black" aria-hidden="true">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-2/5" />
          <Skeleton className="h-3 w-1/4" />
        </div>
        <Skeleton className="size-7 shrink-0 rounded-sm" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-sm" />
        <Skeleton className="h-5 w-20 rounded-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </article>
  ))
}
