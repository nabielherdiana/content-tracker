import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type ActivityItem = {
  id: string
  action: string
  created_at: string
  content_item_id: string
}

type ActivityLabels = {
  title: string
  subtitle: string
  empty: string
}

export function ActivityFeed({
  activity,
  labels,
  locale,
}: {
  activity: ActivityItem[]
  labels: ActivityLabels
  locale: string
}) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{labels.title}</CardTitle>
        <CardDescription>{labels.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        ) : (
          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {activity.map((item) => (
              <div key={item.id} className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                <p className="text-sm font-medium capitalize">{item.action.replaceAll('_', ' ')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{new Date(item.created_at).toLocaleString(locale)}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
