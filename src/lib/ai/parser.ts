import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { aiParsedOutputSchema, type AiParsedOutput, type AiParsedItem } from '@/validations/ai'

const OPENAI_TIMEOUT_MS = 12_000
const GOOGLE_TIMEOUT_MS = 12_000
const GOOGLE_MODELS_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'
const GOOGLE_MODEL_PREFERENCES = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
] as const

type ParseSource = 'openai' | 'google' | 'fallback'

export type ParsePromptResult = {
  result: AiParsedOutput
  source: ParseSource
  providerErrors: string[]
}

const openAiCompatibleResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string().nullable(),
      }),
    }),
  ),
})

const googleListModelsSchema = z.object({
  models: z
    .array(
      z.object({
        name: z.string(),
        supportedGenerationMethods: z.array(z.string()).optional(),
      }),
    )
    .optional(),
})

function extractJson(content: string): string {
  const trimmed = content.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed
  }

  const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i)
  if (fenced?.[1]) {
    return fenced[1].trim()
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1)
  }

  throw new Error('AI response is not valid JSON')
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs)
      }),
    ])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

function toIsoDateFromParts(year: number, monthIndex: number, day: number): string | undefined {
  const date = new Date(Date.UTC(year, monthIndex, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    return undefined
  }

  return `${year.toString().padStart(4, '0')}-${(monthIndex + 1).toString().padStart(2, '0')}-${day
    .toString()
    .padStart(2, '0')}`
}

function parseMonthWord(rawMonth: string): number | undefined {
  const monthMap: Record<string, number> = {
    jan: 0,
    januari: 0,
    january: 0,
    feb: 1,
    februari: 1,
    february: 1,
    mar: 2,
    maret: 2,
    march: 2,
    apr: 3,
    april: 3,
    mei: 4,
    may: 4,
    jun: 5,
    juni: 5,
    june: 5,
    jul: 6,
    juli: 6,
    july: 6,
    agu: 7,
    ags: 7,
    agustus: 7,
    august: 7,
    sep: 8,
    september: 8,
    okt: 9,
    october: 9,
    oktober: 9,
    nov: 10,
    november: 10,
    des: 11,
    december: 11,
    desember: 11,
  }

  const key = rawMonth.toLowerCase()
  return monthMap[key] ?? monthMap[key.slice(0, 3)]
}

function toIsoDate(input: string | undefined): string | undefined {
  if (!input) return undefined
  const normalized = input.trim()
  if (!normalized) return undefined

  // Keep date-only values as-is.
  const isoDateOnly = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoDateOnly) {
    return toIsoDateFromParts(Number(isoDateOnly[1]), Number(isoDateOnly[2]) - 1, Number(isoDateOnly[3]))
  }

  // Preserve date part for datetime formats to avoid timezone day-shift.
  const isoDateWithTime = normalized.match(/^(\d{4})-(\d{2})-(\d{2})[T\s].*$/)
  if (isoDateWithTime) {
    return toIsoDateFromParts(Number(isoDateWithTime[1]), Number(isoDateWithTime[2]) - 1, Number(isoDateWithTime[3]))
  }

  // dd/mm/yyyy or dd-mm-yyyy
  const slashMatch = normalized.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (slashMatch) {
    const day = Number(slashMatch[1])
    const month = Number(slashMatch[2]) - 1
    const rawYear = slashMatch[3]
    const year = Number(rawYear.length === 2 ? `20${rawYear}` : rawYear)
    return toIsoDateFromParts(year, month, day)
  }

  // 7 april 2026
  const dayMonthWord = normalized.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/)
  if (dayMonthWord) {
    const day = Number(dayMonthWord[1])
    const month = parseMonthWord(dayMonthWord[2])
    const year = Number(dayMonthWord[3])
    if (month !== undefined) return toIsoDateFromParts(year, month, day)
  }

  // april 7 2026
  const monthWordDay = normalized.match(/^([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})$/)
  if (monthWordDay) {
    const month = parseMonthWord(monthWordDay[1])
    const day = Number(monthWordDay[2])
    const year = Number(monthWordDay[3])
    if (month !== undefined) return toIsoDateFromParts(year, month, day)
  }

  return undefined
}

function normalizePlatform(token: string | undefined): string | undefined {
  if (!token) return undefined

  const key = token.trim().toLowerCase()
  const map: Record<string, string> = {
    tiktok: 'TikTok',
    'tik tok': 'TikTok',
    instagram: 'Instagram',
    ig: 'Instagram',
    youtube: 'YouTube',
    yt: 'YouTube',
    facebook: 'Facebook',
    fb: 'Facebook',
    linkedin: 'LinkedIn',
    twitter: 'X',
    x: 'X',
  }

  return map[key] ?? undefined
}

function parseLocalizedDate(text: string | undefined): string | undefined {
  if (!text) return undefined
  const normalized = text.trim()
  const direct = toIsoDate(normalized)
  if (direct) return direct

  const wordMatch = normalized.match(/(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/i)
  if (wordMatch) {
    return toIsoDate(`${wordMatch[1]} ${wordMatch[2]} ${wordMatch[3]}`)
  }

  return undefined
}

function inferPriority(prompt: string): 'Low' | 'Medium' | 'High' | 'Urgent' {
  if (/urgent|mendesak|segera|asap/i.test(prompt)) return 'Urgent'
  if (/high|tinggi|prioritas tinggi/i.test(prompt)) return 'High'
  if (/low|rendah/i.test(prompt)) return 'Low'
  return 'Medium'
}

function inferContentType(prompt: string): string | undefined {
  if (/carousel/i.test(prompt)) return 'Carousel'
  if (/reels|short/i.test(prompt)) return 'Reels'
  if (/story/i.test(prompt)) return 'Story'
  if (/video/i.test(prompt)) return 'Video'
  if (/feed/i.test(prompt)) return 'Feed'
  return undefined
}

function extractRequestedCount(prompt: string): number | undefined {
  const explicit = prompt.match(/(?:tambahkan|buat|add|create)\s+(\d+)\s*(?:task|konten|content|item)/i)
  if (explicit) return Number(explicit[1])

  const generic = prompt.match(/(\d+)\s*(?:task|konten|content|item)/i)
  if (generic) return Number(generic[1])

  return undefined
}

function extractCommonDeadline(prompt: string): string | undefined {
  const candidates = [
    prompt.match(
      /(?:deadline|deadlinenya|jatuh tempo|due(?: date)?)\D{0,20}(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+[a-zA-Z]+\s+\d{4})/i,
    )?.[1],
    prompt.match(/(?:tanggal|tgl)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s+[a-zA-Z]+\s+\d{4})/i)?.[1],
  ]

  for (const candidate of candidates) {
    const parsed = parseLocalizedDate(candidate)
    if (parsed) return parsed
  }

  return undefined
}

function extractTheme(prompt: string): string | undefined {
  const fromTema = prompt.match(/tema\s*(?:konten)?\s*(?:tentang|mengenai)?\s*([^,.\n]+)/i)?.[1]?.trim()
  if (fromTema) return fromTema

  const fromTentang = prompt.match(/(?:tentang|mengenai)\s+([^,.\n]+)/i)?.[1]?.trim()
  if (fromTentang) return fromTentang

  return undefined
}

function buildFallbackTitle(platform: string | undefined, theme: string | undefined, index: number, total: number) {
  const base = platform ?? 'Task'
  const themePart = theme ? ` - ${theme}` : ''
  const numberPart = total > 1 ? ` #${index + 1}` : ''
  const title = `${base}${themePart}${numberPart}`.trim()
  return title.slice(0, 90)
}

function fallbackParser(prompt: string): AiParsedOutput {
  const normalized = prompt.trim()
  const requestedCount = extractRequestedCount(normalized)
  const deadline = extractCommonDeadline(normalized)
  const priority = inferPriority(normalized)
  const contentType = inferContentType(normalized)
  const theme = extractTheme(normalized)

  const countedPlatforms = Array.from(
    normalized.matchAll(
      /(\d+)\s*(?:task|konten|content|item)?\s*(?:untuk|for)\s*(facebook|fb|tiktok|instagram|ig|youtube|yt|linkedin|twitter|x)\b/gi,
    ),
  )

  const items: AiParsedItem[] = []

  for (const entry of countedPlatforms) {
    const count = Number(entry[1])
    const platform = normalizePlatform(entry[2])
    if (!platform || !Number.isFinite(count) || count <= 0) continue
    for (let i = 0; i < count; i += 1) {
      items.push({
        title: buildFallbackTitle(platform, theme, items.length, Math.max(requestedCount ?? 0, 2)),
        brief: normalized,
        platform,
        content_type: contentType,
        status: 'To Do',
        priority,
        deadline,
        references: [],
        tags: [],
      })
    }
  }

  if (items.length === 0) {
    const platformMentions = Array.from(
      new Set(
        Array.from(normalized.matchAll(/\b(facebook|fb|tiktok|instagram|ig|youtube|yt|linkedin|twitter|x)\b/gi))
          .map((match) => normalizePlatform(match[1]))
          .filter((value): value is string => Boolean(value)),
      ),
    )

    for (const platform of platformMentions) {
      items.push({
        title: buildFallbackTitle(platform, theme, items.length, Math.max(platformMentions.length, requestedCount ?? 1)),
        brief: normalized,
        platform,
        content_type: contentType,
        status: 'To Do',
        priority,
        deadline,
        references: [],
        tags: [],
      })
    }
  }

  const targetCount = Math.max(requestedCount ?? 1, items.length || 1)
  while (items.length < targetCount) {
    items.push({
      title: buildFallbackTitle(undefined, theme, items.length, targetCount),
      brief: normalized,
      content_type: contentType,
      status: 'To Do',
      priority,
      deadline,
      references: [],
      tags: [],
    })
  }

  const sanitizedItems = items.map((item, index) => ({
    ...item,
    title: item.title || buildFallbackTitle(item.platform, theme, index, items.length),
  }))

  return {
    action: sanitizedItems.length > 1 ? 'create_many' : 'create_one',
    items: sanitizedItems,
  }
}

const systemPrompt = `You are a structured content task parser for Content Tracker.
Return strict JSON only, no markdown and no extra narrative.

Rules:
- Convert user prompt into structured tasks.
- action must be one of: create_one, create_many, update_existing.
- If user asks for multiple items, use create_many.
- If user asks to update existing task, use update_existing.
- Use status enum: Backlog, To Do, On Going, Review, Revision, Done, Cancelled.
- Use priority enum: Low, Medium, High, Urgent.
- Dates must be ISO format YYYY-MM-DD.
- For date-only fields (deadline, publish_date), never include time or timezone.
- Put unknown extra data in custom_fields.
- Language can follow user language (Indonesian/English).
`

async function parseWithOpenAICompatible(prompt: string): Promise<AiParsedOutput> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const baseUrl = process.env.OPENAI_API_BASE_URL ?? 'https://api.openai.com/v1'
  const model = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini'

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Today is ${new Date().toISOString()}.\n\nPrompt:\n${prompt}` },
        ],
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    throw new Error(`OpenAI-compatible request failed (${response.status})`)
  }

  const raw = await response.json()
  const parsed = openAiCompatibleResponseSchema.parse(raw)
  const content = parsed.choices[0]?.message.content

  if (!content) {
    throw new Error('OpenAI-compatible response is empty')
  }

  const asObject = JSON.parse(extractJson(content))
  const validated = aiParsedOutputSchema.parse(asObject)

  return {
    ...validated,
    items: validated.items.map((item) => ({
      ...item,
      deadline: toIsoDate(item.deadline),
      publish_date: toIsoDate(item.publish_date),
    })),
  }
}

async function parseWithGoogle(prompt: string): Promise<AiParsedOutput> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not configured')
  }

  const configuredModel = process.env.GOOGLE_MODEL?.trim() || 'gemini-2.0-flash'
  let availableModels: string[] = []
  try {
    const listResponse = await withTimeout(
      fetch(`${GOOGLE_MODELS_ENDPOINT}?key=${apiKey}`, { method: 'GET', cache: 'no-store' }),
      GOOGLE_TIMEOUT_MS,
      'Google AI list models timeout.',
    )

    if (listResponse.ok) {
      const raw = await listResponse.json()
      const parsed = googleListModelsSchema.parse(raw)
      availableModels = (parsed.models ?? [])
        .filter((model) => (model.supportedGenerationMethods ?? []).includes('generateContent'))
        .map((model) => model.name.replace(/^models\//, ''))
    }
  } catch {
    // Ignore list model errors and continue with preferred candidates.
  }

  const candidateBase = [configuredModel, ...GOOGLE_MODEL_PREFERENCES]
  const modelCandidates =
    availableModels.length > 0
      ? Array.from(new Set(candidateBase.filter((model) => availableModels.includes(model))))
      : Array.from(new Set(candidateBase))

  const safeCandidates = modelCandidates.length > 0 ? modelCandidates : ['gemini-2.0-flash']
  let lastError: Error | null = null

  for (const modelName of safeCandidates) {
    try {
      const result = await withTimeout(
        generateObject({
          model: google(modelName),
          schema: aiParsedOutputSchema,
          system: `${systemPrompt}\nToday is: ${new Date().toISOString()}`,
          prompt,
        }),
        GOOGLE_TIMEOUT_MS,
        `Google AI request timeout for model "${modelName}".`,
      )

      const validated = aiParsedOutputSchema.parse(result.object)
      return {
        ...validated,
        items: validated.items.map((item) => ({
          ...item,
          deadline: toIsoDate(item.deadline),
          publish_date: toIsoDate(item.publish_date),
        })),
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown Google AI error')
    }
  }

      throw lastError ?? new Error('Google AI provider failed')
}

export async function parsePromptToStructured(prompt: string): Promise<ParsePromptResult> {
  const errors: string[] = []

  if (process.env.OPENAI_API_KEY) {
    try {
      return {
        result: await parseWithOpenAICompatible(prompt),
        source: 'openai',
        providerErrors: errors,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OpenAI-compatible provider error'
      errors.push(message)
      // fall through to next provider
    }
  }

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    try {
      return {
        result: await parseWithGoogle(prompt),
        source: 'google',
        providerErrors: errors,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google provider error'
      errors.push(message)
      // fall through to fallback parser
    }
  }

  // Prevent indefinite loading by always returning a deterministic fallback.
  // Also preserve last provider error for server logs.
  if (errors.length > 0) {
    console.warn('AI providers failed, fallback parser used:', errors.join(' | '))
  }

  return {
    result: fallbackParser(prompt),
    source: 'fallback',
    providerErrors: errors,
  }
}
