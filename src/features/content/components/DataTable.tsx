'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { toast } from 'sonner'
import { Calendar, MoreHorizontal, Trash2, Pencil, Copy, Eye, CheckSquare, Filter, Search, ChevronDown, ChevronUp } from 'lucide-react'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { bulkUpdateStatus, deleteTask, duplicateTask, updateTaskStatus } from '@/lib/actions'
import type { ContentItemListRow, ContentStatus } from '@/types'
import { CONTENT_STATUSES } from '@/types'
import { useI18n } from '@/components/providers/LanguageProvider'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  Backlog: 'bg-muted/70 text-foreground/80',
  'To Do': 'bg-slate-500/15 text-slate-700 dark:text-slate-200',
  'On Going': 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  Review: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  Revision: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  Done: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  Cancelled: 'bg-red-500/15 text-red-700 dark:text-red-300',
}

const PRIORITY_ORDER: Record<string, number> = {
  Urgent: 4,
  High: 3,
  Medium: 2,
  Low: 1,
}

const SELECTABLE_STATUSES = CONTENT_STATUSES.filter((status) => status !== 'Backlog')

function normalizeStatus(status: ContentStatus) {
  if (status === 'Backlog') return 'To Do' as ContentStatus
  return status
}

function dueBadge(task: ContentItemListRow, isEn: boolean) {
  if (!task.deadline || ['Done', 'Cancelled'].includes(task.status)) return null
  const today = new Date().toISOString().slice(0, 10)
  if (task.deadline < today) return <Badge variant="destructive">{isEn ? 'Overdue' : 'Terlambat'}</Badge>
  if (task.deadline === today)
    return <Badge className="bg-amber-500/90 text-white">{isEn ? 'Due Today' : 'Deadline Hari Ini'}</Badge>
  return null
}

function TaskKanban({
  data,
  selectedIds,
  onToggleSelect,
  onMoveTask,
  movingTaskId,
  isEn,
  selectLabel,
}: {
  data: ContentItemListRow[]
  selectedIds: Set<string>
  onToggleSelect: (id: string, checked: boolean) => void
  onMoveTask: (taskId: string, fromStatus: ContentStatus, toStatus: ContentStatus) => Promise<void>
  movingTaskId: string | null
  isEn: boolean
  selectLabel: string
}) {
  const [draggingTaskId, setDraggingTaskId] = React.useState<string | null>(null)
  const [draggingFromStatus, setDraggingFromStatus] = React.useState<ContentStatus | null>(null)
  const [overStatus, setOverStatus] = React.useState<ContentStatus | null>(null)

  const handleDragStart = React.useCallback((event: React.DragEvent<HTMLDivElement>, task: ContentItemListRow) => {
    const target = event.target as HTMLElement
    if (target.closest('a,button,input,label')) {
      event.preventDefault()
      return
    }

    event.dataTransfer.setData('text/plain', task.id)
    event.dataTransfer.setData('application/x-content-status', task.status)
    event.dataTransfer.effectAllowed = 'move'
    setDraggingTaskId(task.id)
    setDraggingFromStatus(task.status)
  }, [])

  const handleDragEnd = React.useCallback(() => {
    setDraggingTaskId(null)
    setDraggingFromStatus(null)
    setOverStatus(null)
  }, [])

  const handleDrop = React.useCallback(
    async (event: React.DragEvent<HTMLDivElement>, nextStatus: ContentStatus) => {
      event.preventDefault()
      const taskId = event.dataTransfer.getData('text/plain') || draggingTaskId
      const rawFromStatus = event.dataTransfer.getData('application/x-content-status')
      const fromStatus = (rawFromStatus || draggingFromStatus) as ContentStatus | null

      setOverStatus(null)
      if (!taskId || !fromStatus) {
        setDraggingTaskId(null)
        setDraggingFromStatus(null)
        return
      }

      setDraggingTaskId(null)
      setDraggingFromStatus(null)
      await onMoveTask(taskId, fromStatus, nextStatus)
    },
    [draggingFromStatus, draggingTaskId, onMoveTask],
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {SELECTABLE_STATUSES.map((status) => {
        const items = data.filter((task) => task.status === status)
        const isOver = overStatus === status

        return (
          <div
            key={status}
            className={`rounded-xl border bg-muted/20 p-3 space-y-3 transition-all ${
              isOver ? 'border-primary ring-1 ring-primary/35 bg-primary/5' : 'border-border/50'
            }`}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              setOverStatus(status)
            }}
            onDragEnter={(event) => {
              event.preventDefault()
              setOverStatus(status)
            }}
            onDragLeave={() => {
              if (overStatus === status) setOverStatus(null)
            }}
            onDrop={(event) => void handleDrop(event, status)}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{status}</h3>
              <Badge variant="outline">{items.length}</Badge>
            </div>
            <div className="space-y-2">
              {items.map((task) => (
                <div
                  key={task.id}
                  className={`bg-card border border-border/50 rounded-lg p-3 shadow-sm space-y-2 ${
                    movingTaskId === task.id ? 'opacity-70' : ''
                  } ${draggingTaskId === task.id ? 'cursor-grabbing opacity-60' : 'cursor-grab'}`}
                  draggable={movingTaskId !== task.id}
                  onDragStart={(event) => handleDragStart(event, task)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="flex items-start justify-between gap-2">
                    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(task.id)}
                        onChange={(e) => onToggleSelect(task.id, e.target.checked)}
                      />
                      {selectLabel}
                    </label>
                    {dueBadge(task, isEn)}
                  </div>
                  <Link href={`/tasks/${task.id}`} className="font-medium text-sm leading-tight hover:underline line-clamp-2">
                    {task.title}
                  </Link>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    {task.platform ?? (isEn ? 'No platform' : 'Tanpa platform')}
                    <span className="w-1 h-1 rounded-full bg-border" />
                    {task.deadline ?? (isEn ? 'No deadline' : 'Tanpa deadline')}
                  </div>
                </div>
              ))}

              {items.length === 0 && isOver && (
                <div className="rounded-lg border border-dashed border-primary/50 bg-primary/5 p-3 text-xs text-primary">
                  {isEn ? 'Drop task here' : 'Lepaskan task di sini'}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function DataTable({ data }: { data: ContentItemListRow[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { language } = useI18n()
  const isEn = language === 'en'

  const [view, setView] = React.useState<'table' | 'card' | 'kanban'>('table')
  const [query, setQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [platformFilter, setPlatformFilter] = React.useState('all')
  const [priorityFilter, setPriorityFilter] = React.useState('all')
  const [contentTypeFilter, setContentTypeFilter] = React.useState('all')
  const [deadlineFilter, setDeadlineFilter] = React.useState<'all' | 'overdue' | 'today' | 'this_week' | 'no_deadline'>('all')
  const [sortBy, setSortBy] = React.useState<'deadline' | 'updated_at' | 'priority'>('updated_at')
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = React.useState<ContentStatus>('On Going')
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isBulkUpdating, setIsBulkUpdating] = React.useState(false)
  const [statusUpdatingId, setStatusUpdatingId] = React.useState<string | null>(null)
  const [optimisticStatusMap, setOptimisticStatusMap] = React.useState<Record<string, ContentStatus>>({})
  const [showMobileFilters, setShowMobileFilters] = React.useState(false)
  const deferredQuery = React.useDeferredValue(query)

  const labels = React.useMemo(
    () => ({
      allStatus: isEn ? 'All Statuses' : 'Semua Status',
      allPlatform: isEn ? 'All Platforms' : 'Semua Platform',
      allPriority: isEn ? 'All Priorities' : 'Semua Prioritas',
      allType: isEn ? 'All Types' : 'Semua Tipe',
      allDeadline: isEn ? 'All Deadlines' : 'Semua Deadline',
      overdue: isEn ? 'Overdue' : 'Terlambat',
      dueToday: isEn ? 'Due Today' : 'Deadline Hari Ini',
      dueWeek: isEn ? 'Due in 7 Days' : '7 Hari Kedepan',
      noDeadline: isEn ? 'No Deadline' : 'Tanpa Deadline',
      search: isEn ? 'Search title, brief, tag...' : 'Cari title, brief, tag...',
      showing: isEn ? 'Showing' : 'Menampilkan',
      of: isEn ? 'of' : 'dari',
      tasks: isEn ? 'tasks' : 'task',
      prev: isEn ? 'Previous' : 'Sebelumnya',
      next: isEn ? 'Next' : 'Berikutnya',
      table: isEn ? 'Table' : 'Tabel',
      card: isEn ? 'Card' : 'Kartu',
      kanban: 'Kanban',
      sortUpdated: isEn ? 'Sort: Updated' : 'Sort: Terbaru',
      sortDeadline: isEn ? 'Sort: Deadline' : 'Sort: Deadline',
      sortPriority: isEn ? 'Sort: Priority' : 'Sort: Prioritas',
      bulkUpdate: isEn ? 'Bulk Update' : 'Bulk Update',
      minSelect: isEn ? 'Select at least one task' : 'Pilih minimal satu task',
      statusUpdated: isEn ? 'Status updated for' : 'Status berhasil diubah untuk',
      quickStatusUpdated: isEn ? 'Task status updated to' : 'Status task diubah ke',
      kanbanMoved: isEn ? 'Task moved to' : 'Task dipindahkan ke',
      duplicated: isEn ? 'Task duplicated' : 'Task berhasil diduplikasi',
      deleted: isEn ? 'Task deleted' : 'Task berhasil dihapus',
      deleteTitle: isEn ? 'Delete task?' : 'Hapus Task?',
      deleteDesc: isEn ? 'This action cannot be undone.' : 'Tindakan ini tidak bisa dibatalkan.',
      cancel: isEn ? 'Cancel' : 'Batal',
      confirmDelete: isEn ? 'Yes, Delete' : 'Ya, Hapus',
      deleting: isEn ? 'Deleting...' : 'Menghapus...',
      emptyTitle: isEn ? 'No content yet' : 'Belum ada konten',
      emptyDesc: isEn ? 'Start by creating your first task.' : 'Mulai tambahkan konten pertama Anda dengan klik tombol Task Baru.',
      detail: isEn ? 'Detail' : 'Detail',
      edit: isEn ? 'Edit' : 'Edit',
      duplicate: isEn ? 'Duplicate' : 'Duplikat',
      delete: isEn ? 'Delete' : 'Hapus',
      filters: isEn ? 'Filters' : 'Filter',
      hideFilters: isEn ? 'Hide filters' : 'Sembunyikan filter',
      showFilters: isEn ? 'Show filters' : 'Tampilkan filter',
      selectItem: isEn ? 'Select' : 'Pilih',
    }),
    [isEn],
  )

  const activeFilterCount = React.useMemo(() => {
    let count = 0
    if (statusFilter !== 'all') count += 1
    if (platformFilter !== 'all') count += 1
    if (priorityFilter !== 'all') count += 1
    if (contentTypeFilter !== 'all') count += 1
    if (deadlineFilter !== 'all') count += 1
    return count
  }, [contentTypeFilter, deadlineFilter, platformFilter, priorityFilter, statusFilter])

  React.useEffect(() => {
    setOptimisticStatusMap({})
  }, [data])

  React.useEffect(() => {
    const q = searchParams.get('q') ?? ''
    setQuery(q)
  }, [searchParams])

  const effectiveData = React.useMemo(
    () =>
      data.map((item) => {
        const nextStatus = optimisticStatusMap[item.id]
        return nextStatus ? { ...item, status: nextStatus } : item
      }),
    [data, optimisticStatusMap],
  )

  const uniquePlatforms = React.useMemo(
    () => Array.from(new Set(effectiveData.map((item) => item.platform).filter(Boolean))) as string[],
    [effectiveData],
  )

  const uniqueContentTypes = React.useMemo(
    () => Array.from(new Set(effectiveData.map((item) => item.content_type).filter(Boolean))) as string[],
    [effectiveData],
  )

  const filteredData = React.useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayIso = today.toISOString().slice(0, 10)
    const weekEnd = new Date(today)
    weekEnd.setDate(today.getDate() + 7)
    const normalizedQuery = deferredQuery.trim().toLowerCase()

    return effectiveData
      .filter((item) => {
        const matchesQuery =
          !normalizedQuery ||
          item.title.toLowerCase().includes(normalizedQuery) ||
          (item.brief ?? '').toLowerCase().includes(normalizedQuery) ||
          (item.tags ?? []).join(' ').toLowerCase().includes(normalizedQuery)

        const matchesStatus = statusFilter === 'all' || item.status === statusFilter
        const matchesPlatform = platformFilter === 'all' || item.platform === platformFilter
        const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter
        const matchesContentType = contentTypeFilter === 'all' || item.content_type === contentTypeFilter

        let matchesDeadline = true
        if (deadlineFilter === 'overdue') {
          matchesDeadline = Boolean(item.deadline && item.deadline < todayIso && !['Done', 'Cancelled'].includes(item.status))
        } else if (deadlineFilter === 'today') {
          matchesDeadline = item.deadline === todayIso
        } else if (deadlineFilter === 'this_week') {
          matchesDeadline = Boolean(item.deadline && new Date(item.deadline) >= today && new Date(item.deadline) <= weekEnd)
        } else if (deadlineFilter === 'no_deadline') {
          matchesDeadline = !item.deadline
        }

        return matchesQuery && matchesStatus && matchesPlatform && matchesPriority && matchesContentType && matchesDeadline
      })
      .sort((a, b) => {
        if (sortBy === 'updated_at') return b.updated_at.localeCompare(a.updated_at)
        if (sortBy === 'deadline') {
          const aDate = a.deadline ?? '9999-12-31'
          const bDate = b.deadline ?? '9999-12-31'
          return aDate.localeCompare(bDate)
        }
        return (PRIORITY_ORDER[b.priority] ?? 0) - (PRIORITY_ORDER[a.priority] ?? 0)
      })
  }, [contentTypeFilter, deadlineFilter, deferredQuery, effectiveData, platformFilter, priorityFilter, sortBy, statusFilter])

  const handleToggleSelect = React.useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const handleSelectAllVisible = React.useCallback((checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(filteredData.map((item) => item.id)))
  }, [filteredData])

  const handleTaskStatusChange = React.useCallback(
    async (taskId: string, currentStatus: ContentStatus, nextStatus: ContentStatus, source: 'quick' | 'kanban') => {
      const normalizedCurrent = normalizeStatus(currentStatus)
      if (normalizedCurrent === nextStatus) return

      setStatusUpdatingId(taskId)
      setOptimisticStatusMap((prev) => ({ ...prev, [taskId]: nextStatus }))
      const result = await updateTaskStatus(taskId, nextStatus)
      if (result.error) {
        setOptimisticStatusMap((prev) => ({ ...prev, [taskId]: normalizedCurrent }))
        toast.error(result.error)
        setStatusUpdatingId(null)
        return
      }

      toast.success(`${source === 'kanban' ? labels.kanbanMoved : labels.quickStatusUpdated} ${nextStatus}`)
      setStatusUpdatingId(null)
      router.refresh()
    },
    [labels.kanbanMoved, labels.quickStatusUpdated, router],
  )

  const handleQuickStatusChange = React.useCallback(
    async (taskId: string, currentStatus: ContentStatus, nextStatus: ContentStatus) => {
      await handleTaskStatusChange(taskId, currentStatus, nextStatus, 'quick')
    },
    [handleTaskStatusChange],
  )

  const handleKanbanMove = React.useCallback(
    async (taskId: string, fromStatus: ContentStatus, toStatus: ContentStatus) => {
      await handleTaskStatusChange(taskId, fromStatus, toStatus, 'kanban')
    },
    [handleTaskStatusChange],
  )

  const columns = React.useMemo<ColumnDef<ContentItemListRow>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <input
            type="checkbox"
            checked={filteredData.length > 0 && filteredData.every((item) => selectedIds.has(item.id))}
            onChange={(e) => handleSelectAllVisible(e.target.checked)}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedIds.has(row.original.id)}
            onChange={(e) => handleToggleSelect(row.original.id, e.target.checked)}
          />
        ),
      },
      {
        accessorKey: 'title',
        header: isEn ? 'Title' : 'Judul',
        cell: ({ row }) => (
          <div className="space-y-1">
            <Link href={`/tasks/${row.original.id}`} className="font-medium hover:underline line-clamp-1">
              {row.original.title}
            </Link>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {row.original.platform ?? (isEn ? 'No platform' : 'Tanpa platform')}
              <span className="w-1 h-1 rounded-full bg-border" />
              {row.original.content_type ?? (isEn ? 'No type' : 'Tanpa tipe')}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Select
            value={normalizeStatus(row.original.status)}
            onValueChange={(value) =>
              void handleQuickStatusChange(row.original.id, row.original.status, value as ContentStatus)
            }
            disabled={statusUpdatingId === row.original.id}
          >
            <SelectTrigger className="h-8 min-w-[140px] bg-muted/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SELECTABLE_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
      },
      {
        accessorKey: 'deadline',
        header: 'Deadline',
        cell: ({ row }) => {
          const deadline = row.original.deadline
          return (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                {deadline ?? '-'}
              </div>
              {dueBadge(row.original, isEn)}
            </div>
          )
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
              <MoreHorizontal className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/tasks/${row.original.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                {labels.detail}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/tasks/${row.original.id}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" />
                {labels.edit}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  const result = await duplicateTask(row.original.id)
                  if (result.error) {
                    toast.error(result.error)
                    return
                  }
                  toast.success(labels.duplicated)
                  router.refresh()
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                {labels.duplicate}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(row.original.id)}>
                <Trash2 className="mr-2 h-4 w-4" />
                {labels.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [
      filteredData,
      handleQuickStatusChange,
      handleSelectAllVisible,
      handleToggleSelect,
      isEn,
      labels,
      router,
      selectedIds,
      statusUpdatingId,
    ],
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  })

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    const result = await deleteTask(deleteId)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(labels.deleted)
      router.refresh()
    }
    setIsDeleting(false)
    setDeleteId(null)
  }

  const handleBulkUpdate = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      toast.error(labels.minSelect)
      return
    }

    setIsBulkUpdating(true)
    const result = await bulkUpdateStatus(ids, bulkStatus)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`${labels.statusUpdated} ${result.data?.count ?? ids.length} ${labels.tasks}`)
      setSelectedIds(new Set())
      router.refresh()
    }
    setIsBulkUpdating(false)
  }

  if (effectiveData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Calendar className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">{labels.emptyTitle}</h3>
        <p className="text-muted-foreground text-sm max-w-xs">{labels.emptyDesc}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={labels.search} className="pl-9" />
        </div>

        <div className="lg:hidden">
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setShowMobileFilters((prev) => !prev)}
          >
            <span className="inline-flex items-center gap-2">
              <Filter className="h-4 w-4" />
              {showMobileFilters ? labels.hideFilters : labels.showFilters}
              {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </span>
            {showMobileFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        <div
          className={cn(
            'grid gap-2',
            'grid-cols-2 lg:grid-cols-7 lg:gap-3',
            !showMobileFilters && 'hidden lg:grid',
          )}
        >
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? 'all')}>
            <SelectTrigger className="w-full">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue>{statusFilter === 'all' ? labels.allStatus : statusFilter}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{labels.allStatus}</SelectItem>
              {SELECTABLE_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={platformFilter} onValueChange={(value) => setPlatformFilter(value ?? 'all')}>
            <SelectTrigger className="w-full">
              <SelectValue>{platformFilter === 'all' ? labels.allPlatform : platformFilter}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{labels.allPlatform}</SelectItem>
              {uniquePlatforms.map((platform) => (
                <SelectItem key={platform} value={platform}>
                  {platform}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value ?? 'all')}>
            <SelectTrigger className="w-full">
              <SelectValue>{priorityFilter === 'all' ? labels.allPriority : priorityFilter}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{labels.allPriority}</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>

          <Select value={contentTypeFilter} onValueChange={(value) => setContentTypeFilter(value ?? 'all')}>
            <SelectTrigger className="w-full">
              <SelectValue>{contentTypeFilter === 'all' ? labels.allType : contentTypeFilter}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{labels.allType}</SelectItem>
              {uniqueContentTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={deadlineFilter}
            onValueChange={(value) => setDeadlineFilter((value ?? 'all') as 'all' | 'overdue' | 'today' | 'this_week' | 'no_deadline')}
          >
            <SelectTrigger className="w-full col-span-2 lg:col-span-1">
              <SelectValue>
                {deadlineFilter === 'all'
                  ? labels.allDeadline
                  : deadlineFilter === 'overdue'
                    ? labels.overdue
                    : deadlineFilter === 'today'
                      ? labels.dueToday
                      : deadlineFilter === 'this_week'
                        ? labels.dueWeek
                        : labels.noDeadline}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{labels.allDeadline}</SelectItem>
              <SelectItem value="overdue">{labels.overdue}</SelectItem>
              <SelectItem value="today">{labels.dueToday}</SelectItem>
              <SelectItem value="this_week">{labels.dueWeek}</SelectItem>
              <SelectItem value="no_deadline">{labels.noDeadline}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center gap-3 xl:justify-between rounded-xl border border-border/50 bg-muted/20 p-3">
        <Tabs value={view} onValueChange={(value) => setView(value as 'table' | 'card' | 'kanban')}>
          <TabsList>
            <TabsTrigger value="table">{labels.table}</TabsTrigger>
            <TabsTrigger value="card">{labels.card}</TabsTrigger>
            <TabsTrigger value="kanban">{labels.kanban}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:w-auto">
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy((value ?? 'updated_at') as 'deadline' | 'updated_at' | 'priority')}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue>
                {sortBy === 'updated_at' ? labels.sortUpdated : sortBy === 'deadline' ? labels.sortDeadline : labels.sortPriority}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated_at">{labels.sortUpdated}</SelectItem>
              <SelectItem value="deadline">{labels.sortDeadline}</SelectItem>
              <SelectItem value="priority">{labels.sortPriority}</SelectItem>
            </SelectContent>
          </Select>

          <div className={cn('flex w-full gap-2 sm:w-auto', selectedIds.size === 0 && 'hidden sm:flex')}>
            <Select value={bulkStatus} onValueChange={(value) => setBulkStatus((value ?? 'On Going') as ContentStatus)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue>{bulkStatus}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SELECTABLE_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button className="w-full sm:w-auto" onClick={handleBulkUpdate} disabled={isBulkUpdating || selectedIds.size === 0}>
              <CheckSquare className="mr-2 w-4 h-4" />
              {labels.bulkUpdate} ({selectedIds.size})
            </Button>
          </div>
        </div>
      </div>

      {view === 'kanban' && (
        <TaskKanban
          data={filteredData}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onMoveTask={handleKanbanMove}
          movingTaskId={statusUpdatingId}
          isEn={isEn}
          selectLabel={labels.selectItem}
        />
      )}

      {view === 'card' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredData.map((task) => (
            <CardItem
              key={task.id}
              task={task}
              selected={selectedIds.has(task.id)}
              onToggleSelect={handleToggleSelect}
              onDelete={() => setDeleteId(task.id)}
              onDuplicate={async () => {
                const result = await duplicateTask(task.id)
                if (result.error) toast.error(result.error)
                else {
                  toast.success(labels.duplicated)
                  router.refresh()
                }
              }}
      labels={labels}
      isEn={isEn}
    />
  ))}
</div>
      )}

      {view === 'table' && (
        <div className="w-full overflow-x-auto rounded-lg border border-border/50">
          <Table>
            <TableHeader className="bg-muted/30">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between p-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              {labels.showing} {table.getRowModel().rows.length} {labels.of} {filteredData.length} {labels.tasks}
            </p>
            <div className="space-x-2">
              <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                {labels.prev}
              </Button>
              <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                {labels.next}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.deleteTitle}</DialogTitle>
            <DialogDescription>{labels.deleteDesc}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {labels.cancel}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? labels.deleting : labels.confirmDelete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CardItem({
  task,
  selected,
  onToggleSelect,
  onDelete,
  onDuplicate,
  labels,
  isEn,
}: {
  task: ContentItemListRow
  selected: boolean
  onToggleSelect: (id: string, checked: boolean) => void
  onDelete: () => void
  onDuplicate: () => Promise<void>
  labels: {
    selectItem: string
    detail: string
    edit: string
    duplicate: string
    delete: string
  }
  isEn: boolean
}) {
  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-2">
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={selected} onChange={(e) => onToggleSelect(task.id, e.target.checked)} />
          {labels.selectItem}
        </label>
        {dueBadge(task, isEn)}
      </div>

      <Link href={`/tasks/${task.id}`} className="font-semibold text-sm hover:underline line-clamp-2">
        {task.title}
      </Link>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className={`${STATUS_COLORS[task.status] ?? ''} border-transparent`}>
          {task.status}
        </Badge>
        <Badge variant="outline">{task.priority}</Badge>
      </div>

      <div className="text-xs text-muted-foreground">
        {task.platform ?? (isEn ? 'No platform' : 'Tanpa platform')} | {task.content_type ?? (isEn ? 'No type' : 'Tanpa tipe')} | {task.deadline ?? (isEn ? 'No deadline' : 'Tanpa deadline')}
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
        <Link href={`/tasks/${task.id}`}>
          <Button variant="outline" size="sm">
            {labels.detail}
          </Button>
        </Link>
        <Link href={`/tasks/${task.id}/edit`}>
          <Button variant="outline" size="sm">
            {labels.edit}
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={onDuplicate}>
          {labels.duplicate}
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          {labels.delete}
        </Button>
      </div>
    </div>
  )
}
