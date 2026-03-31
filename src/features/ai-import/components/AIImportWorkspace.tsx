'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Wand2, AlertTriangle, Save, Loader2, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { saveParsedAIResult } from '@/lib/actions'
import type { AiParsedOutput } from '@/validations/ai'
import type { TaskTarget } from '@/types'
import { CONTENT_PRIORITIES, CONTENT_STATUSES } from '@/types'
import { useI18n } from '@/components/providers/LanguageProvider'

const SELECTABLE_STATUSES = CONTENT_STATUSES.filter((status) => status !== 'Backlog')

function emptyParsedItem() {
  return {
    title: '',
    brief: '',
    platform: '',
    content_type: '',
    status: 'To Do' as const,
    priority: 'Medium' as const,
    deadline: '',
    notes: '',
    references: [] as string[],
    tags: [] as string[],
  }
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function findTaskByLabel(tasks: TaskTarget[], label: string | undefined): TaskTarget | undefined {
  if (!label) return undefined
  const token = normalizeText(label)
  if (!token) return undefined

  const exact = tasks.find((task) => normalizeText(task.title) === token)
  if (exact) return exact

  return tasks.find((task) => normalizeText(task.title).includes(token) || token.includes(normalizeText(task.title)))
}

function sanitizeParsedOutputForTasks(parsed: AiParsedOutput, tasks: TaskTarget[]): AiParsedOutput {
  if (parsed.action !== 'update_existing') return parsed

  const taskIdSet = new Set(tasks.map((task) => task.id))

  return {
    ...parsed,
    items: parsed.items.map((item) => {
      const rawTargetId = item.target_task_id?.trim()

      if (rawTargetId && taskIdSet.has(rawTargetId)) {
        return item
      }

      const byTitle = findTaskByLabel(tasks, item.title)
      if (byTitle) {
        return {
          ...item,
          target_task_id: byTitle.id,
        }
      }

      return {
        ...item,
        target_task_id: undefined,
      }
    }),
  }
}

export function AIImportWorkspace({ tasks }: { tasks: TaskTarget[] }) {
  const router = useRouter()
  const { language, t } = useI18n()
  const taskIdSet = React.useMemo(() => new Set(tasks.map((task) => task.id)), [tasks])
  const taskById = React.useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])
  const [prompt, setPrompt] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [parsedData, setParsedData] = React.useState<AiParsedOutput | null>(null)
  const [errorText, setErrorText] = React.useState<string | null>(null)
  const [isDesktop, setIsDesktop] = React.useState(false)

  const labels = React.useMemo(
    () => ({
      subtitle:
        language === 'en'
          ? 'Prompt to parse, review/edit, and save. You can create many tasks at once or update existing tasks.'
          : 'Prompt ke parse, review/edit, lalu simpan. Bisa create banyak task sekaligus atau update existing.',
      promptTitle: language === 'en' ? 'Write Prompt' : 'Tulis Prompt',
      promptExample:
        language === 'en'
          ? 'Example: Add 3 TikTok tasks next week and update existing task deadlines.'
          : 'Contoh: Tambahkan 3 task TikTok minggu depan dan update task existing untuk deadline baru.',
      promptPlaceholder:
        language === 'en' ? 'Type full instruction here...' : 'Ketik instruksi lengkap di sini...',
      parseButton: t('ai.parse'),
      parseServerError:
        language === 'en' ? 'Failed to reach AI server' : 'Gagal menghubungi AI server',
      parseTimeout:
        language === 'en'
          ? 'AI request timeout (30 seconds). Please retry or shorten your prompt.'
          : 'AI request timeout (30 detik). Coba ulang lagi atau ringkas prompt.',
      unknownError: language === 'en' ? 'Something went wrong' : 'Terjadi kesalahan',
      invalidUpdateTarget:
        language === 'en'
          ? 'Select a valid target task for all update items.'
          : 'Pilih target task yang valid untuk semua item update.',
      saveFailedTitle: language === 'en' ? 'Failed to save AI result' : 'Gagal menyimpan hasil AI',
      saveSuccessTitle: language === 'en' ? 'AI result saved successfully' : 'Hasil AI berhasil disimpan',
      saveSummary: language === 'en' ? 'Created' : 'Dibuat',
      saveSummaryUpdated: language === 'en' ? 'Updated' : 'Diperbarui',
      parsingFailedTitle: t('ai.parseFailed'),
      previewTitle: language === 'en' ? 'AI Result Preview' : 'Preview Hasil AI',
      addRow: language === 'en' ? 'Add Row' : 'Tambah Baris',
      saveResult: t('ai.saveResult'),
      itemLabel: language === 'en' ? 'Item' : 'Item',
      targetTaskLabel: language === 'en' ? 'Target Task (for update)' : 'Target Task (untuk update)',
      targetTaskPlaceholder: language === 'en' ? 'Select target task' : 'Pilih task target',
      invalidTargetHint:
        language === 'en'
          ? 'Target from AI is invalid. Please choose target task again.'
          : 'Target dari AI tidak valid. Pilih ulang task target.',
      titleLabel: 'Title',
      briefLabel: 'Brief',
      platformLabel: 'Platform',
      contentTypeLabel: 'Content Type',
      statusLabel: 'Status',
      priorityLabel: 'Priority',
      deadlineLabel: language === 'en' ? 'Deadline' : 'Deadline',
      notesLabel: 'Notes',
      characterUnit: language === 'en' ? 'characters' : 'karakter',
      enterHint: language === 'en' ? 'Enter: Parse, Shift+Enter: New line' : 'Enter: Parse, Shift+Enter: New line',
    }),
    [language, t],
  )

  React.useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const apply = () => setIsDesktop(media.matches)
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])

  const handleParse = async () => {
    if (!prompt.trim()) return

    setIsLoading(true)
    setErrorText(null)
    setParsedData(null)

    let timeout: ReturnType<typeof setTimeout> | null = null
    try {
      const controller = new AbortController()
      timeout = setTimeout(() => controller.abort(), 30_000)

      const response = await fetch('/api/ai/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      })

      const json = await response.json()

      if (!response.ok) {
        throw new Error(json.error || labels.parseServerError)
      }

      const sanitized = sanitizeParsedOutputForTasks(json.result as AiParsedOutput, tasks)
      setParsedData(sanitized)
    } catch (err: unknown) {
      const isTimeout = err instanceof Error && err.name === 'AbortError'
      const message = isTimeout
        ? labels.parseTimeout
        : err instanceof Error
          ? err.message
          : labels.unknownError
      setErrorText(message)
    } finally {
      if (timeout) clearTimeout(timeout)
      setIsLoading(false)
    }
  }

  const updateItem = (index: number, key: string, value: unknown) => {
    setParsedData((prev) => {
      if (!prev) return prev
      const items = [...prev.items]
      items[index] = { ...items[index], [key]: value }
      return { ...prev, items }
    })
  }

  const removeItem = (index: number) => {
    setParsedData((prev) => {
      if (!prev) return prev
      const items = prev.items.filter((_, i) => i !== index)
      return items.length === 0 ? null : { ...prev, items }
    })
  }

  const addItem = () => {
    setParsedData((prev) => {
      if (!prev) {
        return { action: 'create_many', items: [emptyParsedItem()] }
      }
      return { ...prev, items: [...prev.items, emptyParsedItem()] }
    })
  }

  const handleSave = async () => {
    if (!parsedData) return
    if (
      parsedData.action === 'update_existing' &&
      parsedData.items.some((item) => !item.target_task_id || !taskIdSet.has(item.target_task_id))
    ) {
      toast.error(labels.invalidUpdateTarget)
      return
    }

    setIsSaving(true)
    const result = await saveParsedAIResult(parsedData)

    if (result.error) {
      toast.error(labels.saveFailedTitle, { description: result.error })
      setIsSaving(false)
      return
    }

    toast.success(labels.saveSuccessTitle, {
      description: `${labels.saveSummary}: ${result.data?.created ?? 0}, ${labels.saveSummaryUpdated}: ${result.data?.updated ?? 0}`,
    })
    setParsedData(null)
    setPrompt('')
    setIsSaving(false)
    router.refresh()
  }

  return (
    <div className="max-w-5xl mx-auto w-full space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Wand2 className="w-7 h-7 text-primary" />
          {t('ai.title')}
        </h1>
        <p className="text-muted-foreground">{labels.subtitle}</p>
      </div>

      <Card className="shadow-sm border-border/50 bg-card">
        <CardHeader>
          <CardTitle>{labels.promptTitle}</CardTitle>
          <CardDescription>{labels.promptExample}</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder={labels.promptPlaceholder}
            className="min-h-[160px] resize-y bg-muted/20 text-base"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              const isComposing = (e.nativeEvent as KeyboardEvent).isComposing
              if (isComposing) return

              const wantsParseByEnter =
                isDesktop &&
                e.key === 'Enter' &&
                !e.shiftKey &&
                !e.ctrlKey &&
                !e.metaKey &&
                !e.altKey
              const wantsParseByShortcut =
                (e.ctrlKey || e.metaKey) && e.key === 'Enter'

              if ((wantsParseByEnter || wantsParseByShortcut) && !isLoading && prompt.trim().length > 0) {
                e.preventDefault()
                void handleParse()
              }
            }}
            maxLength={3000}
          />
        </CardContent>
        <CardFooter className="flex justify-between items-center bg-muted/10 border-t border-border/50 py-4">
          <p className="text-xs text-muted-foreground">
            {prompt.length}/3000 {labels.characterUnit} {isDesktop ? `| ${labels.enterHint}` : ''}
          </p>
          <Button onClick={handleParse} disabled={isLoading || prompt.trim().length === 0}>
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
            {labels.parseButton}
          </Button>
        </CardFooter>
      </Card>

      {errorText && (
        <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 shadow-sm">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{labels.parsingFailedTitle}</AlertTitle>
          <AlertDescription>{errorText}</AlertDescription>
        </Alert>
      )}

      {parsedData && (
        <div className="space-y-4">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>{labels.previewTitle}</CardTitle>
                <CardDescription>
                  Action: <strong>{parsedData.action}</strong> | {labels.itemLabel}: <strong>{parsedData.items.length}</strong>
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  {labels.addRow}
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {labels.saveResult}
                </Button>
              </div>
            </CardHeader>
          </Card>

          <div className="grid gap-4">
            {parsedData.items.map((item, index) => {
              const targetTaskId =
                item.target_task_id && taskIdSet.has(item.target_task_id) ? item.target_task_id : ''

              return (
                <Card key={index} className="shadow-sm border-border/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">
                        {labels.itemLabel} {index + 1}
                      </Badge>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {parsedData.action === 'update_existing' && (
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-sm font-medium">{labels.targetTaskLabel}</label>
                        <Select
                          value={targetTaskId}
                          onValueChange={(value) => updateItem(index, 'target_task_id', value)}
                        >
                          <SelectTrigger className="bg-muted/20">
                            <SelectValue placeholder={labels.targetTaskPlaceholder} />
                          </SelectTrigger>
                          <SelectContent>
                            {tasks.map((task) => (
                              <SelectItem key={task.id} value={task.id}>
                                {task.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {item.target_task_id && !taskById.has(item.target_task_id) && (
                          <p className="text-xs text-amber-600 dark:text-amber-300">
                            {labels.invalidTargetHint}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="md:col-span-2 space-y-1">
                      <label className="text-sm font-medium">{labels.titleLabel}</label>
                      <Input value={item.title} onChange={(e) => updateItem(index, 'title', e.target.value)} />
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <label className="text-sm font-medium">{labels.briefLabel}</label>
                      <Textarea value={item.brief ?? ''} onChange={(e) => updateItem(index, 'brief', e.target.value)} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium">{labels.platformLabel}</label>
                      <Input value={item.platform ?? ''} onChange={(e) => updateItem(index, 'platform', e.target.value)} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium">{labels.contentTypeLabel}</label>
                      <Input value={item.content_type ?? ''} onChange={(e) => updateItem(index, 'content_type', e.target.value)} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium">{labels.statusLabel}</label>
                      <Select value={item.status} onValueChange={(value) => updateItem(index, 'status', value)}>
                        <SelectTrigger className="bg-muted/20">
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
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium">{labels.priorityLabel}</label>
                      <Select value={item.priority} onValueChange={(value) => updateItem(index, 'priority', value)}>
                        <SelectTrigger className="bg-muted/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONTENT_PRIORITIES.map((priority) => (
                            <SelectItem key={priority} value={priority}>
                              {priority}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium">{labels.deadlineLabel}</label>
                      <Input type="date" value={item.deadline ?? ''} onChange={(e) => updateItem(index, 'deadline', e.target.value)} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium">{labels.notesLabel}</label>
                      <Input value={item.notes ?? ''} onChange={(e) => updateItem(index, 'notes', e.target.value)} />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
