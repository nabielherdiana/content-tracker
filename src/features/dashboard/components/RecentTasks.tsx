import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'
import type { ContentItem } from '@/types'

type DashboardTask = Pick<ContentItem, 'id' | 'title' | 'platform' | 'deadline' | 'status'>

type RecentTaskLabels = {
  title: string
  subtitle: string
  overdue: string
  dueToday: string
  dueSoon: string
  empty: string
}

function deadlineBadge(task: DashboardTask, labels: RecentTaskLabels) {
  if (!task.deadline || ['Done', 'Cancelled'].includes(task.status)) return null
  const today = new Date().toISOString().slice(0, 10)
  if (task.deadline < today) return <Badge variant="destructive">{labels.overdue}</Badge>
  if (task.deadline === today) return <Badge className="bg-amber-500 text-white">{labels.dueToday}</Badge>
  return <Badge variant="outline">{labels.dueSoon}</Badge>
}

export function RecentTasks({ tasks, labels }: { tasks: DashboardTask[]; labels: RecentTaskLabels }) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{labels.title}</CardTitle>
        <CardDescription>{labels.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-7 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">{labels.empty}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {tasks.slice(0, 6).map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm leading-tight line-clamp-1">{task.title}</p>
                  <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
                    {task.platform && <span>{task.platform}</span>}
                    {task.platform && task.deadline && <span className="h-1 w-1 rounded-full bg-border" />}
                    {task.deadline && <span>{task.deadline}</span>}
                  </div>
                </div>
                <div className="shrink-0">{deadlineBadge(task, labels)}</div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
