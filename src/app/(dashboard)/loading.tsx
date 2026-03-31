export default function DashboardSegmentLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-56 rounded-md bg-muted" />
        <div className="h-4 w-96 rounded-md bg-muted/80" />
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl border border-border/50 bg-card" />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-72 rounded-xl border border-border/50 bg-card" />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-80 rounded-xl border border-border/50 bg-card" />
        ))}
      </div>
    </div>
  )
}
