'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type {
  ContentItem,
  ContentItemListRow,
  ContentStatus,
  CustomFieldDefinition,
  LanguageCode,
  TaskTarget,
  ThemeMode,
} from '@/types'
import {
  contentItemInputSchema,
  customFieldDefinitionInputSchema,
  type ContentItemInput,
  type CustomFieldDefinitionInput,
} from '@/validations/content-item'
import { aiParsedOutputSchema, type AiParsedOutput } from '@/validations/ai'

type ActionResult<T = undefined> = {
  success?: boolean
  error?: string
  data?: T
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

async function getAuthOrError() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { supabase, user: null, error: 'Anda harus login terlebih dahulu.' }
  }

  return { supabase, user, error: null }
}

async function logActivity(supabase: SupabaseServerClient, params: {
  contentItemId: string
  userId: string
  action: string
  oldData?: Record<string, unknown> | null
  newData?: Record<string, unknown> | null
}) {
  await supabase.from('activity_logs').insert({
    content_item_id: params.contentItemId,
    user_id: params.userId,
    action: params.action,
    old_data: params.oldData ?? null,
    new_data: params.newData ?? null,
  })
}

async function syncCustomValues(
  supabase: SupabaseServerClient,
  contentItemId: string,
  userId: string,
  customFieldsData: Record<string, unknown>,
) {
  const definitionIds = Object.keys(customFieldsData)
  if (definitionIds.length === 0) {
    await supabase.from('content_item_custom_values').delete().eq('content_item_id', contentItemId)
    return
  }

  const { data: defs } = await supabase
    .from('custom_field_definitions')
    .select('id')
    .eq('user_id', userId)
    .in('id', definitionIds)

  const validIds = new Set((defs ?? []).map((d) => d.id))

  await supabase.from('content_item_custom_values').delete().eq('content_item_id', contentItemId)

  const rows = Object.entries(customFieldsData)
    .filter(([definitionId]) => validIds.has(definitionId))
    .map(([definitionId, value]) => ({
      content_item_id: contentItemId,
      field_definition_id: definitionId,
      value_json: value,
    }))

  if (rows.length > 0) {
    await supabase.from('content_item_custom_values').insert(rows)
  }
}

function normalizeTaskInput(input: ContentItemInput) {
  return {
    title: input.title,
    brief: input.brief ?? null,
    platform: input.platform ?? null,
    content_type: input.content_type ?? null,
    status: input.status,
    priority: input.priority,
    deadline: input.deadline || null,
    publish_date: input.publish_date || null,
    assignee: input.assignee || null,
    notes: input.notes ?? null,
    references_links: safeArray(input.references_links),
    tags: safeArray(input.tags),
    objective: input.objective ?? null,
    target_audience: input.target_audience ?? null,
    key_message: input.key_message ?? null,
    call_to_action: input.call_to_action ?? null,
    script_or_outline: input.script_or_outline ?? null,
    approval_status: input.approval_status ?? null,
    revision_notes: input.revision_notes ?? null,
    source_brief: input.source_brief ?? null,
    estimated_effort: input.estimated_effort ?? null,
    actual_effort: input.actual_effort ?? null,
    content_pillar: input.content_pillar ?? null,
    campaign_name: input.campaign_name ?? null,
    custom_fields_data: input.custom_fields_data ?? {},
  }
}

export async function createTask(input: ContentItemInput): Promise<ActionResult> {
  const parsed = contentItemInputSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Input task tidak valid.' }
  }

  const { supabase, user, error } = await getAuthOrError()
  if (error || !user) return { error }

  const payload = normalizeTaskInput(parsed.data)

  const { data, error: insertError } = await supabase
    .from('content_items')
    .insert({
      user_id: user.id,
      ...payload,
    })
    .select('id')
    .single()

  if (insertError || !data) {
    return { error: insertError?.message ?? 'Gagal membuat task.' }
  }

  await syncCustomValues(supabase, data.id, user.id, payload.custom_fields_data)
  await logActivity(supabase, {
    contentItemId: data.id,
    userId: user.id,
    action: 'created',
    newData: payload,
  })

  revalidatePath('/dashboard')
  revalidatePath('/tasks')
  revalidatePath('/settings')
  return { success: true }
}

export async function updateTask(id: string, input: Partial<ContentItemInput>): Promise<ActionResult> {
  const { supabase, user, error } = await getAuthOrError()
  if (error || !user) return { error }

  const { data: oldData, error: oldDataError } = await supabase
    .from('content_items')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (oldDataError || !oldData) {
    return { error: 'Task tidak ditemukan.' }
  }

  const merged = contentItemInputSchema.safeParse({
    ...oldData,
    ...input,
  })

  if (!merged.success) {
    return { error: merged.error.issues[0]?.message ?? 'Update task tidak valid.' }
  }

  const payload = normalizeTaskInput(merged.data)

  const { error: updateError } = await supabase
    .from('content_items')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)

  if (updateError) {
    return { error: updateError.message }
  }

  await syncCustomValues(supabase, id, user.id, payload.custom_fields_data)
  await logActivity(supabase, {
    contentItemId: id,
    userId: user.id,
    action: 'updated',
    oldData,
    newData: payload,
  })

  revalidatePath('/dashboard')
  revalidatePath('/tasks')
  revalidatePath(`/tasks/${id}`)
  revalidatePath(`/tasks/${id}/edit`)
  return { success: true }
}

export async function updateTaskStatus(id: string, status: ContentStatus): Promise<ActionResult> {
  const { supabase, user, error } = await getAuthOrError()
  if (error || !user) return { error }

  if (status === 'Backlog') {
    return { error: 'Status Backlog tidak tersedia untuk update cepat.' }
  }

  const { data: existing, error: fetchError } = await supabase
    .from('content_items')
    .select('id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !existing) {
    return { error: 'Task tidak ditemukan.' }
  }

  if (existing.status === status) {
    return { success: true }
  }

  const { error: updateError } = await supabase
    .from('content_items')
    .update({ status })
    .eq('id', id)
    .eq('user_id', user.id)

  if (updateError) {
    return { error: updateError.message }
  }

  await supabase.from('activity_logs').insert({
    content_item_id: id,
    user_id: user.id,
    action: 'status_updated',
    old_data: { status: existing.status },
    new_data: { status },
  })

  revalidatePath('/dashboard')
  revalidatePath('/tasks')
  revalidatePath(`/tasks/${id}`)
  return { success: true }
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const { supabase, user, error } = await getAuthOrError()
  if (error || !user) return { error }

  const { data: existing } = await supabase
    .from('content_items')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  const { error: deleteError } = await supabase
    .from('content_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (deleteError) {
    return { error: deleteError.message }
  }

  if (existing) {
    await logActivity(supabase, {
      contentItemId: id,
      userId: user.id,
      action: 'deleted',
      oldData: existing,
    })
  }

  revalidatePath('/dashboard')
  revalidatePath('/tasks')
  return { success: true }
}

export async function duplicateTask(id: string): Promise<ActionResult> {
  const { supabase, user, error } = await getAuthOrError()
  if (error || !user) return { error }

  const { data: original, error: fetchError } = await supabase
    .from('content_items')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !original) {
    return { error: 'Task sumber tidak ditemukan.' }
  }

  const clonePayload = {
    ...original,
    title: `${original.title} (Copy)`,
    status: 'To Do' as ContentStatus,
    created_at: undefined,
    updated_at: undefined,
    id: undefined,
  }

  const { data: inserted, error: insertError } = await supabase
    .from('content_items')
    .insert({
      user_id: user.id,
      ...clonePayload,
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    return { error: insertError?.message ?? 'Gagal menduplikasi task.' }
  }

  await syncCustomValues(supabase, inserted.id, user.id, original.custom_fields_data ?? {})
  await logActivity(supabase, {
    contentItemId: inserted.id,
    userId: user.id,
    action: 'duplicated',
    newData: clonePayload,
  })

  revalidatePath('/dashboard')
  revalidatePath('/tasks')
  return { success: true }
}

export async function bulkUpdateStatus(ids: string[], status: ContentStatus): Promise<ActionResult<{ count: number }>> {
  const { supabase, user, error } = await getAuthOrError()
  if (error || !user) return { error }

  if (!ids.length) {
    return { error: 'Pilih minimal satu task.' }
  }

  const { data: existing, error: fetchError } = await supabase
    .from('content_items')
    .select('id, status')
    .eq('user_id', user.id)
    .in('id', ids)

  if (fetchError) {
    return { error: fetchError.message }
  }

  const { error: updateError } = await supabase
    .from('content_items')
    .update({ status })
    .eq('user_id', user.id)
    .in('id', ids)

  if (updateError) {
    return { error: updateError.message }
  }

  const logs = safeArray(existing).map((item) => ({
    content_item_id: item.id,
    user_id: user.id,
    action: 'status_bulk_updated',
    old_data: { status: item.status },
    new_data: { status },
  }))

  if (logs.length > 0) {
    await supabase.from('activity_logs').insert(logs)
  }

  revalidatePath('/dashboard')
  revalidatePath('/tasks')
  return { success: true, data: { count: safeArray(existing).length } }
}

export async function fetchTasks() {
  const { supabase, user, error } = await getAuthOrError()
  if (error || !user) return { data: [] as ContentItemListRow[], error }

  const { data, error: fetchError } = await supabase
    .from('content_items')
    .select('id, title, brief, platform, content_type, status, priority, deadline, tags, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (fetchError) {
    return { data: [] as ContentItemListRow[], error: fetchError.message }
  }

  return { data: (data ?? []) as ContentItemListRow[], error: null }
}

export async function fetchTaskTargets() {
  const { supabase, user, error } = await getAuthOrError()
  if (error || !user) return { data: [] as TaskTarget[], error }

  const { data, error: fetchError } = await supabase
    .from('content_items')
    .select('id, title')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (fetchError) {
    return { data: [] as TaskTarget[], error: fetchError.message }
  }

  return { data: (data ?? []) as TaskTarget[], error: null }
}

export async function fetchTaskById(id: string) {
  const { supabase, user, error } = await getAuthOrError()
  if (error || !user) return { data: null as ContentItem | null, error }

  const { data, error: fetchError } = await supabase
    .from('content_items')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError) {
    return { data: null as ContentItem | null, error: fetchError.message }
  }

  return { data: data as ContentItem, error: null }
}

export async function fetchActivityByTask(taskId: string) {
  const { supabase, user, error } = await getAuthOrError()
  if (error || !user) return { data: [], error }

  const { data, error: fetchError } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('content_item_id', taskId)
    .order('created_at', { ascending: false })
    .limit(40)

  if (fetchError) {
    return { data: [], error: fetchError.message }
  }

  return { data: data ?? [], error: null }
}

function startOfWeek(date: Date) {
  const start = new Date(date)
  const day = start.getDay()
  const diff = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + diff)
  start.setHours(0, 0, 0, 0)
  return start
}

function endOfWeek(date: Date) {
  const end = startOfWeek(date)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

export async function fetchDashboardStats() {
  const { supabase, user, error } = await getAuthOrError()
  if (error || !user) {
    return {
      total: 0,
      done: 0,
      ongoing: 0,
      overdue: 0,
      dueToday: 0,
      dueThisWeek: 0,
      monthlyProgress: 0,
      byPlatform: [] as Array<{ name: string; total: number }>,
      byContentType: [] as Array<{ name: string; total: number }>,
      statusCounts: {} as Record<string, number>,
      upcoming: [] as Array<Pick<ContentItem, 'id' | 'title' | 'platform' | 'status' | 'deadline'>>,
      recentActivity: [] as Array<Record<string, unknown>>,
    }
  }

  type DashboardTask = Pick<ContentItem, 'id' | 'title' | 'platform' | 'content_type' | 'status' | 'deadline' | 'created_at'>

  const [{ data: tasks }, { data: recentActivity }] = await Promise.all([
    supabase
      .from('content_items')
      .select('id, title, platform, content_type, status, deadline, created_at')
      .eq('user_id', user.id),
    supabase
      .from('activity_logs')
      .select('id, action, created_at, content_item_id, new_data')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const safeTasks = safeArray(tasks) as DashboardTask[]

  const now = new Date()
  const todayIso = now.toISOString().slice(0, 10)
  const weekStart = startOfWeek(now)
  const weekEnd = endOfWeek(now)

  const total = safeTasks.length
  const done = safeTasks.filter((t) => t.status === 'Done').length
  const ongoing = safeTasks.filter((t) => ['On Going', 'Review', 'Revision'].includes(t.status)).length
  const overdue = safeTasks.filter(
    (t) => t.deadline && t.deadline < todayIso && !['Done', 'Cancelled'].includes(t.status),
  ).length

  const dueToday = safeTasks.filter(
    (t) => t.deadline === todayIso && !['Done', 'Cancelled'].includes(t.status),
  ).length

  const dueThisWeek = safeTasks.filter((t) => {
    if (!t.deadline || ['Done', 'Cancelled'].includes(t.status)) return false
    const date = new Date(t.deadline)
    return date >= weekStart && date <= weekEnd
  }).length

  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const monthTasks = safeTasks.filter((t) => {
    const created = new Date(t.created_at)
    return created.getMonth() === currentMonth && created.getFullYear() === currentYear
  })
  const monthDone = monthTasks.filter((t) => t.status === 'Done').length
  const monthlyProgress = monthTasks.length > 0 ? Math.round((monthDone / monthTasks.length) * 100) : 0

  const byPlatformMap: Record<string, number> = {}
  const byContentTypeMap: Record<string, number> = {}
  const statusCounts: Record<string, number> = {}

  for (const task of safeTasks) {
    const platformKey = task.platform?.trim() || '__unknown_platform__'
    const contentTypeKey = task.content_type?.trim() || '__unknown_content_type__'

    byPlatformMap[platformKey] = (byPlatformMap[platformKey] || 0) + 1
    byContentTypeMap[contentTypeKey] = (byContentTypeMap[contentTypeKey] || 0) + 1
    statusCounts[task.status] = (statusCounts[task.status] || 0) + 1
  }

  const byPlatform = Object.entries(byPlatformMap)
    .map(([name, totalCount]) => ({ name, total: totalCount }))
    .sort((a, b) => b.total - a.total)

  const byContentType = Object.entries(byContentTypeMap)
    .map(([name, totalCount]) => ({ name, total: totalCount }))
    .sort((a, b) => b.total - a.total)

  const upcoming = safeTasks
    .filter((task) => task.deadline && !['Done', 'Cancelled'].includes(task.status))
    .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))
    .slice(0, 8)

  return {
    total,
    done,
    ongoing,
    overdue,
    dueToday,
    dueThisWeek,
    monthlyProgress,
    byPlatform,
    byContentType,
    statusCounts,
    upcoming,
    recentActivity: safeArray(recentActivity),
  }
}

export async function fetchCustomFieldDefinitions() {
  const { supabase, user, error } = await getAuthOrError()
  if (error || !user) return { data: [] as CustomFieldDefinition[], error }

  const { data, error: fetchError } = await supabase
    .from('custom_field_definitions')
    .select('*, options:custom_field_options(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (fetchError) {
    return { data: [] as CustomFieldDefinition[], error: fetchError.message }
  }

  const result = safeArray(data).map((row) => {
    const options = (safeArray(row.options) as Array<{ order_index?: number }>).sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
    )

    return {
      ...row,
      options,
    }
  })

  return { data: result as CustomFieldDefinition[], error: null }
}

export async function saveCustomFieldDefinitions(
  definitions: CustomFieldDefinitionInput[],
): Promise<ActionResult> {
  const { supabase, user, error } = await getAuthOrError()
  if (error || !user) return { error }

  const parsedItems = definitions.map((item) => customFieldDefinitionInputSchema.safeParse(item))
  const invalid = parsedItems.find((item) => !item.success)
  if (invalid && !invalid.success) {
    return { error: invalid.error.issues[0]?.message ?? 'Custom field tidak valid.' }
  }

  const validDefinitions = parsedItems
    .filter((item): item is { success: true; data: CustomFieldDefinitionInput } => item.success)
    .map((item) => item.data)

  const { data: existingDefs } = await supabase
    .from('custom_field_definitions')
    .select('id')
    .eq('user_id', user.id)

  const keepIds: string[] = []

  for (const def of validDefinitions) {
    const definitionPayload = {
      user_id: user.id,
      key: def.key,
      name: def.name,
      field_type: def.field_type,
      is_required: def.is_required,
    }

    let definitionId = def.id

    if (def.id) {
      const { error: updateError } = await supabase
        .from('custom_field_definitions')
        .update(definitionPayload)
        .eq('id', def.id)
        .eq('user_id', user.id)

      if (updateError) {
        return { error: updateError.message }
      }
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('custom_field_definitions')
        .insert(definitionPayload)
        .select('id')
        .single()

      if (insertError || !inserted) {
        return { error: insertError?.message ?? 'Gagal menyimpan custom field.' }
      }
      definitionId = inserted.id
    }

    if (!definitionId) {
      return { error: 'Terjadi kesalahan saat menyimpan custom field.' }
    }

    keepIds.push(definitionId)

    await supabase.from('custom_field_options').delete().eq('field_definition_id', definitionId)

    if (def.field_type === 'select' || def.field_type === 'multi-select') {
      const options = def.options
        .filter((opt) => opt.value.trim().length > 0)
        .map((opt, index) => ({
          field_definition_id: definitionId,
          value: opt.value.trim(),
          label: opt.label.trim() || opt.value.trim(),
          order_index: index,
        }))

      if (options.length > 0) {
        const { error: optionError } = await supabase.from('custom_field_options').insert(options)
        if (optionError) {
          return { error: optionError.message }
        }
      }
    }
  }

  const existingIds = safeArray(existingDefs).map((item) => item.id)
  const removeIds = existingIds.filter((id) => !keepIds.includes(id))

  if (removeIds.length > 0) {
    await supabase.from('custom_field_definitions').delete().in('id', removeIds).eq('user_id', user.id)
  }

  revalidatePath('/settings')
  revalidatePath('/tasks')
  return { success: true }
}

export async function updateProfilePreferences(input: {
  language?: LanguageCode
  theme?: ThemeMode
}): Promise<ActionResult> {
  const { supabase, user, error } = await getAuthOrError()
  if (error || !user) return { error }

  const payload: { preferred_language?: LanguageCode; preferred_theme?: ThemeMode } = {}

  if (input.language) payload.preferred_language = input.language
  if (input.theme) payload.preferred_theme = input.theme

  if (!payload.preferred_language && !payload.preferred_theme) {
    return { success: true }
  }

  // Ensure profile row exists for users created before trigger was added.
  await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email ?? '',
      },
      { onConflict: 'id' },
    )

  let { error: updateError } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', user.id)

  if (updateError) {
    const missingLanguageColumn =
      Boolean(payload.preferred_language) &&
      (updateError.message.includes('preferred_language') || updateError.code === 'PGRST204')
    const missingThemeColumn =
      Boolean(payload.preferred_theme) &&
      (updateError.message.includes('preferred_theme') || updateError.code === 'PGRST204')

    if (missingLanguageColumn || missingThemeColumn) {
      const fallbackPayload: { preferred_language?: LanguageCode; preferred_theme?: ThemeMode } = {
        ...payload,
      }

      if (missingLanguageColumn) delete fallbackPayload.preferred_language
      if (missingThemeColumn) delete fallbackPayload.preferred_theme

      if (!fallbackPayload.preferred_language && !fallbackPayload.preferred_theme) {
        return { success: true }
      }

      const retry = await supabase
        .from('profiles')
        .update(fallbackPayload)
        .eq('id', user.id)

      updateError = retry.error
    }
  }

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function saveParsedAIResult(parsed: AiParsedOutput): Promise<ActionResult<{ created: number; updated: number }>> {
  const { supabase, user, error } = await getAuthOrError()
  if (error || !user) return { error }

  const validated = aiParsedOutputSchema.safeParse(parsed)
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? 'Hasil AI tidak valid.' }
  }

  let created = 0
  let updated = 0

  for (const item of validated.data.items) {
    const payload: ContentItemInput = {
      title: item.title,
      brief: item.brief,
      platform: item.platform,
      content_type: item.content_type,
      status: item.status,
      priority: item.priority,
      deadline: item.deadline,
      publish_date: item.publish_date,
      notes: item.notes,
      references_links: item.references,
      tags: item.tags,
      objective: item.objective,
      target_audience: item.target_audience,
      key_message: item.key_message,
      call_to_action: item.call_to_action,
      script_or_outline: item.script_or_outline,
      approval_status: item.approval_status,
      revision_notes: item.revision_notes,
      source_brief: item.source_brief,
      estimated_effort: item.estimated_effort,
      actual_effort: item.actual_effort,
      content_pillar: item.content_pillar,
      campaign_name: item.campaign_name,
      custom_fields_data: item.custom_fields ?? {},
    }

    if (validated.data.action === 'update_existing') {
      if (!item.target_task_id) {
        return { error: 'Target task untuk mode update wajib dipilih.' }
      }

      const { error: updateError } = await supabase
        .from('content_items')
        .update(normalizeTaskInput(payload))
        .eq('id', item.target_task_id)
        .eq('user_id', user.id)

      if (updateError) {
        return { error: updateError.message }
      }

      await syncCustomValues(supabase, item.target_task_id, user.id, payload.custom_fields_data ?? {})
      await logActivity(supabase, {
        contentItemId: item.target_task_id,
        userId: user.id,
        action: 'updated_by_ai',
        newData: payload,
      })
      updated += 1
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('content_items')
        .insert({ user_id: user.id, ...normalizeTaskInput(payload) })
        .select('id')
        .single()

      if (insertError || !inserted) {
        return { error: insertError?.message ?? 'Gagal menyimpan task dari AI.' }
      }

      await syncCustomValues(supabase, inserted.id, user.id, payload.custom_fields_data ?? {})
      await logActivity(supabase, {
        contentItemId: inserted.id,
        userId: user.id,
        action: 'created_by_ai',
        newData: payload,
      })
      created += 1
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/tasks')
  revalidatePath('/ai-import')

  return { success: true, data: { created, updated } }
}

export async function logAIPrompt(input: {
  prompt: string
  action: 'create_one' | 'create_many' | 'update_existing'
  parsed_result?: Record<string, unknown> | null
  status: 'success' | 'failed'
  error_message?: string
}) {
  const { supabase, user, error } = await getAuthOrError()
  if (error || !user) return

  await supabase.from('ai_prompt_logs').insert({
    user_id: user.id,
    prompt: input.prompt,
    action: input.action,
    parsed_result: input.parsed_result ?? null,
    status: input.status,
    error_message: input.error_message ?? null,
  })
}
