import { z } from 'zod'
import { CONTENT_PRIORITIES, CONTENT_STATUSES, CUSTOM_FIELD_TYPES } from '@/types'

export const customFieldDefinitionInputSchema = z.object({
  id: z.string().uuid().optional(),
  key: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9_]+$/, 'Gunakan huruf kecil, angka, atau underscore'),
  name: z.string().min(2).max(120),
  field_type: z.enum(CUSTOM_FIELD_TYPES),
  is_required: z.boolean().default(false),
  options: z.array(z.object({ value: z.string().min(1), label: z.string().min(1) })).default([]),
})

const optionalString = z.string().trim().optional().transform((value) => value || undefined)

export const contentItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2, 'Judul wajib diisi'),
  brief: optionalString,
  platform: optionalString,
  content_type: optionalString,
  status: z.enum(CONTENT_STATUSES).default('To Do'),
  priority: z.enum(CONTENT_PRIORITIES).default('Medium'),
  deadline: z.string().optional().nullable(),
  publish_date: z.string().optional().nullable(),
  assignee: z.string().uuid().optional().nullable(),
  notes: optionalString,
  references_links: z.array(z.string().min(1)).optional().default([]),
  tags: z.array(z.string().min(1)).optional().default([]),
  objective: optionalString,
  target_audience: optionalString,
  key_message: optionalString,
  call_to_action: optionalString,
  script_or_outline: optionalString,
  approval_status: optionalString,
  revision_notes: optionalString,
  source_brief: optionalString,
  estimated_effort: z.number().nonnegative().optional().nullable(),
  actual_effort: z.number().nonnegative().optional().nullable(),
  content_pillar: optionalString,
  campaign_name: optionalString,
  custom_fields_data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()])).default({}),
})

export const contentItemFormSchema = contentItemInputSchema.extend({
  references_links_raw: z.string().optional().default(''),
  tags_raw: z.string().optional().default(''),
})

export const taskFiltersSchema = z.object({
  q: z.string().optional().default(''),
  status: z.string().optional().default('all'),
  platform: z.string().optional().default('all'),
  priority: z.string().optional().default('all'),
  contentType: z.string().optional().default('all'),
  sortBy: z.enum(['deadline', 'updated_at', 'priority', 'created_at']).default('updated_at'),
})

export type ContentItemInput = z.infer<typeof contentItemInputSchema>
export type CustomFieldDefinitionInput = z.infer<typeof customFieldDefinitionInputSchema>
