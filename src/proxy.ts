import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/tasks/:path*',
    '/ai-import/:path*',
    '/settings/:path*',
    '/login',
    '/auth/:path*',
  ],
}
