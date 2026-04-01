import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { parsePromptToStructured } from '@/lib/ai/parser'
import { aiParsedOutputSchema } from '@/validations/ai'

const requestSchema = z.object({
  prompt: z.string().min(5).max(3000),
})
const AI_PARSE_COOLDOWN_MS = Number(process.env.AI_PARSE_COOLDOWN_MS ?? '3000')
const AI_PARSE_WINDOW_MINUTES = 10
const AI_PARSE_MAX_PER_WINDOW = Number(process.env.AI_PARSE_MAX_PER_10_MIN ?? '40')

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized. Harus login terlebih dahulu.' }, { status: 401 })
  }

  let promptForLog = 'unknown prompt'

  try {
    const body = await req.json()
    const parsedBody = requestSchema.safeParse(body)

    if (!parsedBody.success) {
      return NextResponse.json({ error: parsedBody.error.issues[0]?.message ?? 'Prompt tidak valid.' }, { status: 400 })
    }

    promptForLog = parsedBody.data.prompt

    const { data: lastPromptLog } = await supabase
      .from('ai_prompt_logs')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastPromptLog?.created_at) {
      const elapsedMs = Date.now() - new Date(lastPromptLog.created_at).getTime()
      if (elapsedMs < AI_PARSE_COOLDOWN_MS) {
        const waitSeconds = Math.ceil((AI_PARSE_COOLDOWN_MS - elapsedMs) / 1000)
        return NextResponse.json(
          {
            error:
              `Terlalu cepat. Coba lagi dalam ${waitSeconds} detik.` +
              ` (Cooldown anti-spam aktif)`,
          },
          { status: 429 },
        )
      }
    }

    const windowStartIso = new Date(Date.now() - AI_PARSE_WINDOW_MINUTES * 60_000).toISOString()
    const { count: windowCount } = await supabase
      .from('ai_prompt_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', windowStartIso)

    if ((windowCount ?? 0) >= AI_PARSE_MAX_PER_WINDOW) {
      return NextResponse.json(
        {
          error:
            `Batas request AI tercapai (${AI_PARSE_MAX_PER_WINDOW}/${AI_PARSE_WINDOW_MINUTES} menit). ` +
            'Silakan tunggu sebentar lalu coba lagi.',
        },
        { status: 429 },
      )
    }

    const parsed = await parsePromptToStructured(parsedBody.data.prompt)
    const validated = aiParsedOutputSchema.parse(parsed.result)

    await supabase.from('ai_prompt_logs').insert({
      user_id: user.id,
      prompt: promptForLog,
      action: validated.action,
      parsed_result: {
        ...validated,
        _meta: {
          source: parsed.source,
          provider_errors: parsed.providerErrors,
        },
      },
      status: 'success',
      error_message: parsed.providerErrors.length > 0 ? parsed.providerErrors.join(' | ') : null,
    })

    return NextResponse.json({
      result: validated,
      meta: {
        source: parsed.source,
        provider_errors: parsed.providerErrors,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan pada parser AI.'

    await supabase.from('ai_prompt_logs').insert({
      user_id: user.id,
      prompt: promptForLog,
      action: 'create_many',
      status: 'failed',
      error_message: message,
    })

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
