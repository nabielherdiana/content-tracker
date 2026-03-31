import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Clock3, ListTodo, AlertTriangle } from 'lucide-react'

type Props = {
  total: number
  done: number
  ongoing: number
  overdue: number
  dueToday: number
  dueThisWeek: number
  monthlyProgress: number
  labels: {
    total: string
    ongoing: string
    done: string
    overdue: string
    dueTodaySuffix: string
    dueWeekSuffix: string
    monthlyProgressSuffix: string
    needsAttention: string
    onTrack: string
  }
}

export function SummaryCards({
  total,
  done,
  ongoing,
  overdue,
  dueToday,
  dueThisWeek,
  monthlyProgress,
  labels,
}: Props) {
  const cards = [
    {
      title: labels.total,
      value: total,
      note: `${dueToday} ${labels.dueTodaySuffix}`,
      icon: ListTodo,
      tone: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: labels.ongoing,
      value: ongoing,
      note: `${dueThisWeek} ${labels.dueWeekSuffix}`,
      icon: Clock3,
      tone: 'text-blue-600',
      bg: 'bg-blue-500/10',
    },
    {
      title: labels.done,
      value: done,
      note: `${monthlyProgress}% ${labels.monthlyProgressSuffix}`,
      icon: CheckCircle2,
      tone: 'text-emerald-600',
      bg: 'bg-emerald-500/10',
    },
    {
      title: labels.overdue,
      value: overdue,
      note: overdue > 0 ? labels.needsAttention : labels.onTrack,
      icon: AlertTriangle,
      tone: overdue > 0 ? 'text-destructive' : 'text-muted-foreground',
      bg: overdue > 0 ? 'bg-destructive/10' : 'bg-muted/60',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
            </div>
            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${card.bg}`}>
              <card.icon className={`h-4 w-4 ${card.tone}`} />
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.note}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
