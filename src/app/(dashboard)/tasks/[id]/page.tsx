import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock3, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchActivityByTask, fetchCustomFieldDefinitions, fetchTaskById } from '@/lib/actions'
import { TaskDetailActions } from '@/features/content/components/TaskDetailActions'
import { getServerLanguage } from '@/lib/i18n/server'

export const metadata = {
  title: 'Detail Task - Content Tracker',
}

function renderValue(value: unknown, isEn: boolean) {
  if (value === null || value === undefined || value === '') return '-'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'boolean') return value ? (isEn ? 'Yes' : 'Ya') : isEn ? 'No' : 'Tidak'
  return String(value)
}

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const language = await getServerLanguage()
  const isEn = language === 'en'
  const [{ data: task }, { data: activity }, { data: customFields }] = await Promise.all([
    fetchTaskById(id),
    fetchActivityByTask(id),
    fetchCustomFieldDefinitions(),
  ])

  if (!task) {
    notFound()
  }

  const customFieldMap = new Map(customFields.map((field) => [field.id, field.name]))

  const isOverdue =
    task.deadline &&
    task.deadline < new Date().toISOString().slice(0, 10) &&
    !['Done', 'Cancelled'].includes(task.status)

  const labels = {
    backToList: isEn ? 'Back to Task List' : 'Kembali ke Task List',
    priority: isEn ? 'Priority' : 'Prioritas',
    overdue: isEn ? 'Overdue' : 'Terlambat',
    contentDetailTitle: isEn ? 'Content Details' : 'Detail Konten',
    contentDetailDesc:
      isEn
        ? 'Complete brief information, strategy, and production metadata.'
        : 'Informasi lengkap brief, strategi, dan metadata produksi.',
    brief: 'Brief',
    objective: isEn ? 'Objective' : 'Tujuan Konten',
    targetAudience: isEn ? 'Target Audience' : 'Target Audiens',
    keyMessage: isEn ? 'Key Message' : 'Pesan Utama',
    callToAction: isEn ? 'Call To Action' : 'Call To Action',
    approvalStatus: isEn ? 'Approval Status' : 'Status Approval',
    campaign: isEn ? 'Campaign' : 'Campaign',
    scriptOutline: isEn ? 'Script / Outline' : 'Script / Outline',
    revisionNotes: isEn ? 'Revision Notes' : 'Catatan Revisi',
    notes: 'Notes',
    tags: 'Tags',
    references: 'References',
    estimatedEffort: isEn ? 'Estimated Effort' : 'Estimasi Effort',
    actualEffort: isEn ? 'Actual Effort' : 'Aktual Effort',
    deadlineSnapshot: isEn ? 'Deadline Snapshot' : 'Ringkasan Deadline',
    deadline: 'Deadline',
    updated: isEn ? 'Updated' : 'Diperbarui',
    customFields: 'Custom Fields',
    noCustomFields:
      isEn ? 'No custom fields for this task yet.' : 'Belum ada custom field untuk task ini.',
    activityLog: isEn ? 'Activity Log' : 'Log Aktivitas',
    noActivity: isEn ? 'No activity history yet.' : 'Belum ada riwayat perubahan.',
  }

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="space-y-2">
          <Link href="/tasks" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            {labels.backToList}
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{task.title}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{task.status}</Badge>
            <Badge variant="outline">
              {labels.priority}: {task.priority}
            </Badge>
            {task.platform && <Badge variant="outline">{task.platform}</Badge>}
            {task.content_type && <Badge variant="outline">{task.content_type}</Badge>}
            {isOverdue && (
              <Badge variant="destructive" className="inline-flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {labels.overdue}
              </Badge>
            )}
          </div>
        </div>

        <TaskDetailActions taskId={task.id} currentStatus={task.status} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>{labels.contentDetailTitle}</CardTitle>
            <CardDescription>{labels.contentDetailDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold mb-1">{labels.brief}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{renderValue(task.brief, isEn)}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">{labels.objective}</p>
                <p>{renderValue(task.objective, isEn)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{labels.targetAudience}</p>
                <p>{renderValue(task.target_audience, isEn)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{labels.keyMessage}</p>
                <p>{renderValue(task.key_message, isEn)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{labels.callToAction}</p>
                <p>{renderValue(task.call_to_action, isEn)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{labels.approvalStatus}</p>
                <p>{renderValue(task.approval_status, isEn)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{labels.campaign}</p>
                <p>{renderValue(task.campaign_name, isEn)}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-1">{labels.scriptOutline}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{renderValue(task.script_or_outline, isEn)}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-1">{labels.revisionNotes}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{renderValue(task.revision_notes, isEn)}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-1">{labels.notes}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{renderValue(task.notes, isEn)}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">{labels.tags}</p>
                <p>{renderValue(task.tags, isEn)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{labels.references}</p>
                <p>{renderValue(task.references_links, isEn)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{labels.estimatedEffort}</p>
                <p>{renderValue(task.estimated_effort, isEn)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{labels.actualEffort}</p>
                <p>{renderValue(task.actual_effort, isEn)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-base">{labels.deadlineSnapshot}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>
                  {labels.deadline}: {renderValue(task.deadline, isEn)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock3 className="w-4 h-4 text-muted-foreground" />
                <span>
                  {labels.updated}: {new Date(task.updated_at).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-base">{labels.customFields}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {Object.keys(task.custom_fields_data || {}).length === 0 && (
                <p className="text-muted-foreground">{labels.noCustomFields}</p>
              )}

              {Object.entries(task.custom_fields_data || {}).map(([fieldId, value]) => (
                <div key={fieldId} className="border-b border-border/50 pb-2 last:border-b-0">
                  <p className="text-xs text-muted-foreground">{customFieldMap.get(fieldId) ?? fieldId}</p>
                  <p>{renderValue(value, isEn)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-base">{labels.activityLog}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {activity.length === 0 && <p className="text-muted-foreground">{labels.noActivity}</p>}
              {activity.map((item) => (
                <div key={item.id} className="border-b border-border/50 pb-2 last:border-b-0">
                  <p className="font-medium">{item.action}</p>
                  <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
