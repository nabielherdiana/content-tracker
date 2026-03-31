import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function resolveCallbackBaseUrl(request: Request) {
  const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (envSiteUrl) {
    return envSiteUrl.replace(/\/+$/, '')
  }

  const requestUrl = new URL(request.url)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto')

  if (forwardedHost) {
    const proto = forwardedProto ?? requestUrl.protocol.replace(':', '')
    const safeProto = proto === 'http' && forwardedHost !== 'localhost' ? 'https' : proto
    return `${safeProto}://${forwardedHost}`.replace(/\/+$/, '')
  }

  if (requestUrl.protocol === 'http:' && requestUrl.hostname !== 'localhost') {
    requestUrl.protocol = 'https:'
  }

  return requestUrl.origin.replace(/\/+$/, '')
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const baseUrl = resolveCallbackBaseUrl(request)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/dashboard'
  const next = nextParam.startsWith('/') ? nextParam : '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(`${baseUrl}${next}`)
    }
  }

  return NextResponse.redirect(`${baseUrl}/login?error=auth-failed`)
}
