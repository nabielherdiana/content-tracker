'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { deleteTask, duplicateTask, updateTaskStatus } from '@/lib/actions'
import { toast } from 'sonner'
import { Copy, Pencil, Trash2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CONTENT_STATUSES, type ContentStatus } from '@/types'
import { useI18n } from '@/components/providers/LanguageProvider'

const QUICK_STATUSES = CONTENT_STATUSES.filter((status) => status !== 'Backlog')

function normalizeStatus(status: ContentStatus) {
  if (status === 'Backlog') return 'To Do'
  return status
}

export function TaskDetailActions({ taskId, currentStatus }: { taskId: string; currentStatus: ContentStatus }) {
  const router = useRouter()
  const { language } = useI18n()
  const isEn = language === 'en'
  const [status, setStatus] = React.useState<ContentStatus>(normalizeStatus(currentStatus))
  const [isStatusUpdating, setIsStatusUpdating] = React.useState(false)

  const handleDuplicate = async () => {
    const result = await duplicateTask(taskId)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(isEn ? 'Task duplicated' : 'Task berhasil diduplikasi')
    router.refresh()
  }

  const handleDelete = async () => {
    const ok = window.confirm(
      isEn ? 'Delete this task? This action cannot be undone.' : 'Hapus task ini? Tindakan tidak bisa dibatalkan.',
    )
    if (!ok) return

    const result = await deleteTask(taskId)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(isEn ? 'Task deleted' : 'Task berhasil dihapus')
    router.push('/tasks')
  }

  const handleMarkDone = async () => {
    const result = await updateTaskStatus(taskId, 'Done')
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(isEn ? 'Status changed to Done' : 'Status diubah menjadi Done')
    router.refresh()
  }

  const handleQuickStatusChange = async (nextStatus: ContentStatus) => {
    const prevStatus = status
    if (nextStatus === prevStatus) return

    setStatus(nextStatus)
    setIsStatusUpdating(true)

    const result = await updateTaskStatus(taskId, nextStatus)
    if (result.error) {
      setStatus(prevStatus)
      toast.error(result.error)
      setIsStatusUpdating(false)
      return
    }

    toast.success(isEn ? `Status updated to ${nextStatus}` : `Status diubah ke ${nextStatus}`)
    setIsStatusUpdating(false)
    router.refresh()
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={status}
        onValueChange={(value) => {
          if (!value) return
          void handleQuickStatusChange(value as ContentStatus)
        }}
        disabled={isStatusUpdating}
      >
        <SelectTrigger className="w-[170px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {QUICK_STATUSES.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Link href={`/tasks/${taskId}/edit`}>
        <Button variant="outline">
          <Pencil className="mr-2 w-4 h-4" />
          {isEn ? 'Edit' : 'Edit'}
        </Button>
      </Link>
      <Button variant="outline" onClick={handleDuplicate}>
        <Copy className="mr-2 w-4 h-4" />
        {isEn ? 'Duplicate' : 'Duplikat'}
      </Button>
      <Button variant="outline" onClick={handleMarkDone}>
        <CheckCircle2 className="mr-2 w-4 h-4" />
        {isEn ? 'Mark Done' : 'Tandai Selesai'}
      </Button>
      <Button variant="destructive" onClick={handleDelete}>
        <Trash2 className="mr-2 w-4 h-4" />
        {isEn ? 'Delete' : 'Hapus'}
      </Button>
    </div>
  )
}
