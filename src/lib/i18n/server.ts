import { cookies } from 'next/headers'
import type { LanguageCode } from '@/types'
import { messages } from '@/lib/i18n/messages'

export async function getServerLanguage(): Promise<LanguageCode> {
  const cookieStore = await cookies()
  const cookieLang = cookieStore.get('content-tracker-language')?.value
  return cookieLang === 'en' ? 'en' : 'id'
}

export async function getServerMessages() {
  const lang = await getServerLanguage()
  return messages[lang]
}
