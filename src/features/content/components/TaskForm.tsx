'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createTask, updateTask } from '@/lib/actions'
import { Loader2 } from 'lucide-react'
import type { ContentItem, CustomFieldDefinition } from '@/types'
import { CONTENT_PRIORITIES, CONTENT_STATUSES } from '@/types'
import { useI18n } from '@/components/providers/LanguageProvider'

const SELECTABLE_STATUSES = CONTENT_STATUSES.filter((status) => status !== 'Backlog')
const DEFAULT_STATUS = 'To Do' as const
const DEFAULT_PRIORITY = 'Medium' as const

function normalizeFormStatus(value: ContentItem['status'] | undefined) {
  if (!value || value === 'Backlog') return DEFAULT_STATUS
  return value
}

function buildFormSchema() {
  return z.object({
    title: z.string().min(2, 'title_required'),
    brief: z.string().optional(),
    platform: z.string().optional(),
    content_type: z.string().optional(),
    status: z.enum(CONTENT_STATUSES),
    priority: z.enum(CONTENT_PRIORITIES),
    deadline: z.string().optional(),
    publish_date: z.string().optional(),
    notes: z.string().optional(),
    references_links_raw: z.string().optional(),
    tags_raw: z.string().optional(),
    objective: z.string().optional(),
    target_audience: z.string().optional(),
    key_message: z.string().optional(),
    call_to_action: z.string().optional(),
    script_or_outline: z.string().optional(),
    approval_status: z.string().optional(),
    revision_notes: z.string().optional(),
    source_brief: z.string().optional(),
    estimated_effort: z.string().optional(),
    actual_effort: z.string().optional(),
    content_pillar: z.string().optional(),
    campaign_name: z.string().optional(),
  })
}

type TaskFormValues = z.infer<ReturnType<typeof buildFormSchema>>

function toStringArray(value: string | undefined) {
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseNumberOrNull(value: string | undefined) {
  if (!value || value.trim().length === 0) return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

export function TaskForm({
  initialData,
  customFields,
  mode,
}: {
  initialData?: Partial<ContentItem>
  customFields: CustomFieldDefinition[]
  mode: 'create' | 'edit'
}) {
  const router = useRouter()
  const { language } = useI18n()
  const isEn = language === 'en'
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [customFieldValues, setCustomFieldValues] = React.useState<Record<string, string | number | boolean | string[] | null>>(
    initialData?.custom_fields_data ?? {},
  )
  const schema = React.useMemo(() => buildFormSchema(), [])

  const labels = React.useMemo(
    () => ({
      saveFailed: isEn ? 'Failed to save task' : 'Gagal menyimpan task',
      updated: isEn ? 'Task updated successfully' : 'Task berhasil diperbarui',
      created: isEn ? 'Task created successfully' : 'Task berhasil dibuat',
      basicInfoTitle: isEn ? 'Basic Information' : 'Informasi Dasar',
      basicInfoDesc: isEn ? 'Core details for the content/task to be worked on.' : 'Detail inti untuk konten/task yang akan dikerjakan.',
      title: isEn ? 'Content Title*' : 'Judul Konten*',
      titlePlaceholder: isEn ? 'Example: Educational Skincare Reels' : 'Contoh: Reels Edukasi Skincare',
      platform: 'Platform',
      platformPlaceholder: 'Instagram, TikTok, YouTube',
      contentType: isEn ? 'Content Type' : 'Tipe Konten',
      contentTypePlaceholder: 'Reels, Carousel, Story, Video',
      brief: 'Brief',
      briefPlaceholder: isEn ? 'Brief details from manager/client' : 'Detail brief dari atasan/client',
      operationTitle: isEn ? 'Operational' : 'Operasional',
      operationDesc: isEn ? 'Work status, priority, deadlines, and production metadata.' : 'Status kerja, prioritas, deadline, dan metadata produksi.',
      status: 'Status',
      priority: isEn ? 'Priority' : 'Prioritas',
      deadline: 'Deadline',
      publishDate: isEn ? 'Publish Date' : 'Tanggal Publish',
      tags: isEn ? 'Tags (comma-separated)' : 'Tags (pisahkan koma)',
      tagsPlaceholder: isEn ? 'promo, skincare, educational' : 'promo, skincare, edukasi',
      references: isEn ? 'References (URL, comma-separated)' : 'References (URL, pisahkan koma)',
      notes: 'Notes',
      notesPlaceholder: isEn ? 'Operational notes' : 'Catatan operasional',
      strategyTitle: isEn ? 'Content Strategy' : 'Strategi Konten',
      strategyDesc:
        isEn
          ? 'Additional operational fields to clarify briefs and creative outputs.'
          : 'Field operasional tambahan untuk memperjelas brief dan output kreatif.',
      objective: isEn ? 'Objective' : 'Tujuan Konten',
      targetAudience: isEn ? 'Target Audience' : 'Target Audiens',
      keyMessage: isEn ? 'Key Message' : 'Pesan Utama',
      callToAction: isEn ? 'Call To Action' : 'Call To Action',
      approvalStatus: isEn ? 'Approval Status' : 'Status Approval',
      contentPillar: isEn ? 'Content Pillar' : 'Pilar Konten',
      campaignName: isEn ? 'Campaign Name' : 'Nama Campaign',
      sourceBrief: isEn ? 'Source Brief' : 'Sumber Brief',
      estimatedEffort: isEn ? 'Estimated Effort (hours)' : 'Estimasi Effort (jam)',
      actualEffort: isEn ? 'Actual Effort (hours)' : 'Aktual Effort (jam)',
      scriptOutline: isEn ? 'Script / Outline' : 'Script / Outline',
      revisionNotes: isEn ? 'Revision Notes' : 'Catatan Revisi',
      customFieldsTitle: 'Custom Fields',
      customFieldsDesc: isEn ? 'Dynamic fields from settings menu.' : 'Field dinamis dari menu pengaturan.',
      noCustomFields: isEn ? 'No custom fields yet.' : 'Belum ada custom field.',
      selectOption: isEn ? 'Select option' : 'Pilih opsi',
      commaSeparated: isEn ? 'Separate with comma' : 'Pisahkan dengan koma',
      yes: isEn ? 'Yes' : 'Ya',
      no: isEn ? 'No' : 'Tidak',
      cancel: isEn ? 'Cancel' : 'Batal',
      saveChanges: isEn ? 'Save Changes' : 'Simpan Perubahan',
      saveTask: isEn ? 'Save Task' : 'Simpan Task',
    }),
    [isEn],
  )

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initialData?.title || '',
      brief: initialData?.brief || '',
      platform: initialData?.platform || '',
      content_type: initialData?.content_type || '',
      status: normalizeFormStatus(initialData?.status),
      priority: initialData?.priority || DEFAULT_PRIORITY,
      deadline: initialData?.deadline || '',
      publish_date: initialData?.publish_date?.slice(0, 10) || '',
      notes: initialData?.notes || '',
      references_links_raw: Array.isArray(initialData?.references_links) ? initialData?.references_links.join(', ') : '',
      tags_raw: Array.isArray(initialData?.tags) ? initialData?.tags.join(', ') : '',
      objective: initialData?.objective || '',
      target_audience: initialData?.target_audience || '',
      key_message: initialData?.key_message || '',
      call_to_action: initialData?.call_to_action || '',
      script_or_outline: initialData?.script_or_outline || '',
      approval_status: initialData?.approval_status || '',
      revision_notes: initialData?.revision_notes || '',
      source_brief: initialData?.source_brief || '',
      estimated_effort: initialData?.estimated_effort?.toString() || '',
      actual_effort: initialData?.actual_effort?.toString() || '',
      content_pillar: initialData?.content_pillar || '',
      campaign_name: initialData?.campaign_name || '',
    },
  })

  React.useEffect(() => {
    if (form.formState.errors.title) {
      void form.trigger('title')
    }
  }, [form, isEn])

  const updateCustomValue = (fieldId: string, value: string | number | boolean | string[] | null) => {
    setCustomFieldValues((prev) => ({ ...prev, [fieldId]: value }))
  }

  async function onSubmit(values: TaskFormValues) {
    setIsSubmitting(true)

    const payload = {
      title: values.title,
      brief: values.brief,
      platform: values.platform,
      content_type: values.content_type,
      status: values.status,
      priority: values.priority,
      deadline: values.deadline || null,
      publish_date: values.publish_date || null,
      notes: values.notes,
      references_links: toStringArray(values.references_links_raw),
      tags: toStringArray(values.tags_raw),
      objective: values.objective,
      target_audience: values.target_audience,
      key_message: values.key_message,
      call_to_action: values.call_to_action,
      script_or_outline: values.script_or_outline,
      approval_status: values.approval_status,
      revision_notes: values.revision_notes,
      source_brief: values.source_brief,
      estimated_effort: parseNumberOrNull(values.estimated_effort),
      actual_effort: parseNumberOrNull(values.actual_effort),
      content_pillar: values.content_pillar,
      campaign_name: values.campaign_name,
      custom_fields_data: customFieldValues,
    }

    const result =
      mode === 'edit' && initialData?.id
        ? await updateTask(initialData.id, payload)
        : await createTask(payload)

    if (result.error) {
      toast.error(labels.saveFailed, { description: result.error })
      setIsSubmitting(false)
      return
    }

    toast.success(mode === 'edit' ? labels.updated : labels.created)
    router.push('/tasks')
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-20">
        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>{labels.basicInfoTitle}</CardTitle>
            <CardDescription>{labels.basicInfoDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{labels.title}</FormLabel>
                  <FormControl>
                    <Input className="bg-muted/30" placeholder={labels.titlePlaceholder} {...field} />
                  </FormControl>
                  {form.formState.errors.title && (
                    <p className="text-[0.8rem] font-medium text-destructive">
                      {isEn ? 'Title is required.' : 'Judul wajib diisi.'}
                    </p>
                  )}
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{labels.platform}</FormLabel>
                    <FormControl>
                      <Input className="bg-muted/30" placeholder={labels.platformPlaceholder} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{labels.contentType}</FormLabel>
                    <FormControl>
                      <Input className="bg-muted/30" placeholder={labels.contentTypePlaceholder} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="brief"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{labels.brief}</FormLabel>
                  <FormControl>
                    <Textarea className="bg-muted/30 min-h-[120px]" placeholder={labels.briefPlaceholder} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>{labels.operationTitle}</CardTitle>
            <CardDescription>{labels.operationDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{labels.status}</FormLabel>
                    <Select value={field.value ?? DEFAULT_STATUS} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/30">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SELECTABLE_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{labels.priority}</FormLabel>
                    <Select value={field.value ?? DEFAULT_PRIORITY} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/30">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONTENT_PRIORITIES.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {priority}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{labels.deadline}</FormLabel>
                    <FormControl>
                      <Input type="date" className="bg-muted/30" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="publish_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{labels.publishDate}</FormLabel>
                    <FormControl>
                      <Input type="date" className="bg-muted/30" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tags_raw"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{labels.tags}</FormLabel>
                    <FormControl>
                      <Input className="bg-muted/30" placeholder={labels.tagsPlaceholder} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="references_links_raw"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{labels.references}</FormLabel>
                    <FormControl>
                      <Input className="bg-muted/30" placeholder="https://... , https://..." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{labels.notes}</FormLabel>
                  <FormControl>
                    <Textarea className="bg-muted/30" placeholder={labels.notesPlaceholder} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>{labels.strategyTitle}</CardTitle>
            <CardDescription>{labels.strategyDesc}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['objective', labels.objective],
              ['target_audience', labels.targetAudience],
              ['key_message', labels.keyMessage],
              ['call_to_action', labels.callToAction],
              ['approval_status', labels.approvalStatus],
              ['content_pillar', labels.contentPillar],
              ['campaign_name', labels.campaignName],
              ['source_brief', labels.sourceBrief],
              ['estimated_effort', labels.estimatedEffort],
              ['actual_effort', labels.actualEffort],
            ].map(([key, label]) => (
              <FormField
                key={key}
                control={form.control}
                name={key as keyof TaskFormValues}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <Input className="bg-muted/30" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            ))}

            <FormField
              control={form.control}
              name="script_or_outline"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>{labels.scriptOutline}</FormLabel>
                  <FormControl>
                    <Textarea className="bg-muted/30 min-h-[100px]" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="revision_notes"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>{labels.revisionNotes}</FormLabel>
                  <FormControl>
                    <Textarea className="bg-muted/30 min-h-[100px]" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>{labels.customFieldsTitle}</CardTitle>
            <CardDescription>{labels.customFieldsDesc}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customFields.length === 0 && <p className="text-sm text-muted-foreground">{labels.noCustomFields}</p>}

            {customFields.map((field) => {
              const value = customFieldValues[field.id]

              if (field.field_type === 'textarea') {
                return (
                  <div key={field.id} className="space-y-1 md:col-span-2">
                    <label className="text-sm font-medium">{field.name}</label>
                    <Textarea
                      className="bg-muted/30"
                      value={typeof value === 'string' ? value : ''}
                      onChange={(e) => updateCustomValue(field.id, e.target.value)}
                    />
                  </div>
                )
              }

              if (field.field_type === 'select' || field.field_type === 'multi-select') {
                const options = (field.options ?? []).map((opt) => opt.value)
                return (
                  <div key={field.id} className="space-y-1">
                    <label className="text-sm font-medium">{field.name}</label>
                    {field.field_type === 'select' ? (
                      <Select
                        value={typeof value === 'string' ? value : ''}
                        onValueChange={(next) => updateCustomValue(field.id, next)}
                      >
                        <SelectTrigger className="bg-muted/30">
                          <SelectValue placeholder={labels.selectOption} />
                        </SelectTrigger>
                        <SelectContent>
                          {options.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        className="bg-muted/30"
                        placeholder={labels.commaSeparated}
                        value={Array.isArray(value) ? value.join(', ') : ''}
                        onChange={(e) => updateCustomValue(field.id, toStringArray(e.target.value))}
                      />
                    )}
                  </div>
                )
              }

              if (field.field_type === 'boolean') {
                return (
                  <div key={field.id} className="space-y-1">
                    <label className="text-sm font-medium">{field.name}</label>
                    <Select
                      value={typeof value === 'boolean' ? String(value) : 'false'}
                      onValueChange={(next) => updateCustomValue(field.id, next === 'true')}
                    >
                      <SelectTrigger className="bg-muted/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">{labels.yes}</SelectItem>
                        <SelectItem value="false">{labels.no}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )
              }

              return (
                <div key={field.id} className="space-y-1">
                  <label className="text-sm font-medium">{field.name}</label>
                  <Input
                    className="bg-muted/30"
                    type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : field.field_type === 'url' ? 'url' : 'text'}
                    value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
                    onChange={(e) => {
                      if (field.field_type === 'number') {
                        const parsed = Number(e.target.value)
                        updateCustomValue(field.id, Number.isNaN(parsed) ? null : parsed)
                        return
                      }
                      updateCustomValue(field.id, e.target.value)
                    }}
                  />
                </div>
              )
            })}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 sticky bottom-4 z-10 bg-card/80 backdrop-blur border border-border/50 p-4 rounded-xl shadow-lg">
          <Button variant="ghost" type="button" onClick={() => router.back()}>
            {labels.cancel}
          </Button>
          <Button type="submit" disabled={isSubmitting} className="shadow-sm">
            {isSubmitting && <Loader2 className="animate-spin mr-2 w-4 h-4" />}
            {mode === 'edit' ? labels.saveChanges : labels.saveTask}
          </Button>
        </div>
      </form>
    </Form>
  )
}
