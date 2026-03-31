import { SummaryCards } from '@/features/dashboard/components/SummaryCards'
import { ChartOverview } from '@/features/dashboard/components/ChartOverview'
import { RecentTasks } from '@/features/dashboard/components/RecentTasks'
import { ActivityFeed } from '@/features/dashboard/components/ActivityFeed'
import { fetchDashboardStats } from '@/lib/actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { messages } from '@/lib/i18n/messages'
import { getServerLanguage } from '@/lib/i18n/server'
import { PlusCircle, Wand2, Settings, ListTodo } from 'lucide-react'

export const metadata = {
  title: 'Dashboard - Content Tracker',
}

const STATUS_ORDER = ['To Do', 'On Going', 'Review', 'Revision', 'Done', 'Cancelled']

function statusBarClass(status: string) {
  if (status === 'Done') return 'bg-emerald-500'
  if (status === 'On Going') return 'bg-blue-500'
  if (status === 'Review') return 'bg-indigo-500'
  if (status === 'Revision') return 'bg-amber-500'
  if (status === 'Cancelled') return 'bg-rose-500'
  return 'bg-primary'
}

export default async function DashboardPage() {
  const [language, stats] = await Promise.all([getServerLanguage(), fetchDashboardStats()])
  const m = messages[language]
  const locale = language === 'en' ? 'en-US' : 'id-ID'
  const unknownPlatformLabel = language === 'en' ? 'No Platform' : 'Tanpa Platform'
  const unknownContentTypeLabel = language === 'en' ? 'No Content Type' : 'Tanpa Tipe'

  const statusRows = STATUS_ORDER.map((status) => ({
    status,
    value: stats.statusCounts[status] ?? 0,
  })).filter((row) => row.value > 0)

  const maxStatusValue = Math.max(...statusRows.map((row) => row.value), 1)
  const byPlatformData = stats.byPlatform.map((item) => ({
    ...item,
    name: item.name === '__unknown_platform__' ? unknownPlatformLabel : item.name,
  }))
  const byContentTypeData = stats.byContentType.map((item) => ({
    ...item,
    name: item.name === '__unknown_content_type__' ? unknownContentTypeLabel : item.name,
  }))

  const labels = {
    quickActions: language === 'en' ? 'Quick Actions' : 'Aksi Cepat',
    taskList: language === 'en' ? 'Task List' : 'Daftar Task',
    monthlyProgress: language === 'en' ? 'Monthly Progress' : 'Progres Bulanan',
    statusBreakdown: language === 'en' ? 'Status Breakdown' : 'Ringkasan Status',
    statusBreakdownDesc:
      language === 'en' ? 'Distribution of active task status.' : 'Distribusi status task yang sedang aktif.',
    noStatusData: language === 'en' ? 'No status data yet.' : 'Belum ada data status.',
    dueSoon: language === 'en' ? 'Due Soon' : 'Deadline Dekat',
    upcomingDeadlines: language === 'en' ? 'Upcoming Deadlines' : 'Deadline Terdekat',
    upcomingSubtitle:
      language === 'en' ? 'Tasks that need your attention first.' : 'Task yang paling butuh perhatian.',
    emptyUpcoming:
      language === 'en' ? 'No active tasks with deadlines yet.' : 'Belum ada task dengan deadline aktif.',
    recentActivity: m.dashboard.recentActivity,
    recentActivityDesc:
      language === 'en' ? 'Latest changes on tasks and briefs.' : 'Perubahan terakhir pada task dan brief.',
    noActivity: language === 'en' ? 'No recent activity yet.' : 'Belum ada aktivitas terbaru.',
    total: m.dashboard.total,
    ongoing: m.dashboard.ongoing,
    done: m.dashboard.done,
    overdue: m.dashboard.overdue,
    dueTodaySuffix: language === 'en' ? 'due today' : 'deadline hari ini',
    dueWeekSuffix: language === 'en' ? 'due this week' : 'deadline minggu ini',
    monthlyProgressSuffix: language === 'en' ? 'monthly progress' : 'progres bulan ini',
    needsAttention: language === 'en' ? 'Needs attention' : 'Perlu perhatian',
    onTrack: language === 'en' ? 'On track' : 'Aman',
    platformDesc: language === 'en' ? 'Total tasks grouped by target platform.' : 'Jumlah konten berdasarkan platform target.',
    contentTypeDesc: language === 'en' ? 'Total tasks grouped by content type.' : 'Jumlah konten berdasarkan tipe format.',
    noChartData: language === 'en' ? 'No data to display yet.' : 'Belum ada data untuk ditampilkan.',
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="border-border/60 shadow-sm lg:col-span-8">
          <CardContent className="p-5 sm:p-6">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{m.dashboard.title}</h1>
            <p className="mt-1 text-muted-foreground">{m.dashboard.subtitle}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="outline">
                {m.dashboard.dueToday}: {stats.dueToday}
              </Badge>
              <Badge variant="outline">
                {m.dashboard.dueThisWeek}: {stats.dueThisWeek}
              </Badge>
              <Badge variant={stats.overdue > 0 ? 'destructive' : 'outline'}>
                {m.dashboard.overdue}: {stats.overdue}
              </Badge>
              <Badge variant="outline">
                {labels.monthlyProgress}: {stats.monthlyProgress}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm lg:col-span-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{labels.quickActions}</CardTitle>
            <CardDescription>{language === 'en' ? 'Start your next task quickly.' : 'Mulai pekerjaan berikutnya dengan cepat.'}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Link href="/tasks/create">
              <Button size="sm" className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" />
                {m.nav.newTask}
              </Button>
            </Link>
            <Link href="/ai-import">
              <Button size="sm" variant="outline" className="w-full">
                <Wand2 className="mr-2 h-4 w-4" />
                {m.nav.aiImport}
              </Button>
            </Link>
            <Link href="/tasks">
              <Button size="sm" variant="outline" className="w-full">
                <ListTodo className="mr-2 h-4 w-4" />
                {labels.taskList}
              </Button>
            </Link>
            <Link href="/settings">
              <Button size="sm" variant="outline" className="w-full">
                <Settings className="mr-2 h-4 w-4" />
                {m.nav.settings}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <SummaryCards
        total={stats.total}
        done={stats.done}
        ongoing={stats.ongoing}
        overdue={stats.overdue}
        dueToday={stats.dueToday}
        dueThisWeek={stats.dueThisWeek}
        monthlyProgress={stats.monthlyProgress}
        labels={{
          total: labels.total,
          ongoing: labels.ongoing,
          done: labels.done,
          overdue: labels.overdue,
          dueTodaySuffix: labels.dueTodaySuffix,
          dueWeekSuffix: labels.dueWeekSuffix,
          monthlyProgressSuffix: labels.monthlyProgressSuffix,
          needsAttention: labels.needsAttention,
          onTrack: labels.onTrack,
        }}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-8">
          <RecentTasks
            tasks={stats.upcoming}
            labels={{
              title: labels.upcomingDeadlines,
              subtitle: labels.upcomingSubtitle,
              overdue: m.dashboard.overdue,
              dueToday: m.dashboard.dueToday,
              dueSoon: labels.dueSoon,
              empty: labels.emptyUpcoming,
            }}
          />
          <ChartOverview
            title={m.dashboard.byPlatform}
            description={labels.platformDesc}
            data={byPlatformData}
            emptyText={labels.noChartData}
            compactWhenEmpty
            minDataHeight={150}
            maxDataHeight={340}
          />
        </div>

        <div className="space-y-5 lg:col-span-4">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{labels.statusBreakdown}</CardTitle>
              <CardDescription>{labels.statusBreakdownDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {statusRows.length === 0 && <p className="text-sm text-muted-foreground">{labels.noStatusData}</p>}

              {statusRows.map((row) => (
                <div key={row.status} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{row.status}</span>
                    <span className="text-muted-foreground">{row.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${statusBarClass(row.status)}`}
                      style={{ width: `${Math.max((row.value / maxStatusValue) * 100, 8)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <ActivityFeed
            activity={
              stats.recentActivity as Array<{ id: string; action: string; created_at: string; content_item_id: string }>
            }
            labels={{
              title: labels.recentActivity,
              subtitle: labels.recentActivityDesc,
              empty: labels.noActivity,
            }}
            locale={locale}
          />
          <ChartOverview
            title={m.dashboard.byType}
            description={labels.contentTypeDesc}
            data={byContentTypeData}
            emptyText={labels.noChartData}
            compactWhenEmpty
            minDataHeight={150}
            maxDataHeight={340}
          />
        </div>
      </div>
    </div>
  )
}
