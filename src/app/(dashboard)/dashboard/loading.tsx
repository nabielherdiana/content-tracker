import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8 rounded-xl border border-border/60 bg-card p-6 shadow-sm">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-80 max-w-full" />
          <div className="mt-4 flex flex-wrap gap-2">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-36 rounded-full" />
          </div>
        </div>
        <div className="xl:col-span-4 rounded-xl border border-border/60 bg-card p-6 shadow-sm">
          <Skeleton className="h-6 w-28" />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-3 h-8 w-16" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
            <Skeleton className="h-5 w-40" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 5 }).map((_, idx) => (
                <Skeleton key={idx} className="h-14 w-full" />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="mt-4 h-56 w-full" />
          </div>
        </div>
        <div className="space-y-6 xl:col-span-5">
          <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
            <Skeleton className="h-5 w-32" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
            <Skeleton className="h-5 w-36" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Skeleton key={idx} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-4 h-56 w-full" />
      </div>
    </div>
  )
}
