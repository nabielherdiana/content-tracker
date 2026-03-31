import { Skeleton } from '@/components/ui/skeleton'

export default function AIImportLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-[520px] max-w-full" />
      </div>

      <div className="rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="space-y-3 p-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-[420px] max-w-full" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
        <div className="flex items-center justify-between border-t border-border/50 px-6 py-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
