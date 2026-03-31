import { z } from 'zod'
import { CONTENT_PRIORITIES, CONTENT_STATUSES } from '@/types'

export const aiParsedItemSchema = z.object({
  target_task_id: z.string().uuid().optional(),
  title: z.string().min(2),
  brief: z.string().optional(),
  platform: z.string().optional(),
  content_type: z.string().optional(),
  status: z.enum(CONTENT_STATUSES).default('To Do'),
  priority: z.enum(CONTENT_PRIORITIES).default('Medium'),
  deadline: z.string().optional(),
  publish_date: z.string().optional(),
  notes: z.string().optional(),
  references: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  objective: z.string().optional(),
  target_audience: z.string().optional(),
  key_message: z.string().optional(),
  call_to_action: z.string().optional(),
  script_or_outline: z.string().optional(),
  approval_status: z.string().optional(),
  revision_notes: z.string().optional(),
  source_brief: z.string().optional(),
  estimated_effort: z.number().optional(),
  actual_effort: z.number().optional(),
  content_pillar: z.string().optional(),
  campaign_name: z.string().optional(),
  custom_fields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).optional(),
})

export const aiParsedOutputSchema = z.object({
  action: z.enum(['create_one', 'create_many', 'update_existing']),
  items: z.array(aiParsedItemSchema).min(1),
})

export type AiParsedOutput = z.infer<typeof aiParsedOutputSchema>
export type AiParsedItem = z.infer<typeof aiParsedItemSchema>
