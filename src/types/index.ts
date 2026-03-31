export const CONTENT_STATUSES = [
  'Backlog',
  'To Do',
  'On Going',
  'Review',
  'Revision',
  'Done',
  'Cancelled',
] as const

export const CONTENT_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const

export const CUSTOM_FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'date',
  'select',
  'multi-select',
  'boolean',
  'url',
] as const

export type ContentStatus = (typeof CONTENT_STATUSES)[number]
export type ContentPriority = (typeof CONTENT_PRIORITIES)[number]
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number]

export type LanguageCode = 'id' | 'en'
export type ThemeMode = 'light' | 'dark' | 'system'

export type CustomFieldPrimitive = string | number | boolean | null
export type CustomFieldValue = CustomFieldPrimitive | string[]

export type ContentItem = {
  id: string
  user_id: string
  title: string
  brief: string | null
  platform: string | null
  content_type: string | null
  status: ContentStatus
  priority: ContentPriority
  deadline: string | null
  publish_date: string | null
  assignee: string | null
  notes: string | null
  references_links: string[] | null
  tags: string[] | null
  objective: string | null
  target_audience: string | null
  key_message: string | null
  call_to_action: string | null
  script_or_outline: string | null
  approval_status: string | null
  revision_notes: string | null
  source_brief: string | null
  estimated_effort: number | null
  actual_effort: number | null
  content_pillar: string | null
  campaign_name: string | null
  custom_fields_data: Record<string, CustomFieldValue>
  created_at: string
  updated_at: string
}

export type ContentItemListRow = Pick<
  ContentItem,
  'id' | 'title' | 'brief' | 'platform' | 'content_type' | 'status' | 'priority' | 'deadline' | 'tags' | 'updated_at'
>

export type TaskTarget = Pick<ContentItem, 'id' | 'title'>

export type Profile = {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  preferred_language: LanguageCode
  preferred_theme: ThemeMode
  created_at: string
  updated_at: string
}

export type CustomFieldDefinition = {
  id: string
  user_id: string
  key: string
  name: string
  field_type: CustomFieldType
  is_required: boolean
  created_at: string
  updated_at: string
  options?: CustomFieldOption[]
}

export type CustomFieldOption = {
  id: string
  field_definition_id: string
  value: string
  label: string
  order_index: number
  created_at: string
}

export type ContentItemCustomValue = {
  id: string
  content_item_id: string
  field_definition_id: string
  value_json: CustomFieldValue
  created_at: string
  updated_at: string
}

export type ActivityLog = {
  id: string
  content_item_id: string
  user_id: string | null
  action: string
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
}

export type AiPromptLog = {
  id: string
  user_id: string
  prompt: string
  action: 'create_one' | 'create_many' | 'update_existing'
  parsed_result: Record<string, unknown> | null
  status: 'success' | 'failed'
  error_message: string | null
  created_at: string
}
