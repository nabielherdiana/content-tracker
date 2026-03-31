'use client'

import * as React from 'react'
import type { LanguageCode } from '@/types'
import { messages } from '@/lib/i18n/messages'

type LanguageContextValue = {
  language: LanguageCode
  setLanguage: (lang: LanguageCode) => void
  t: (key: string) => string
}

const LanguageContext = React.createContext<LanguageContextValue | null>(null)

function getCookieLanguage(): LanguageCode | null {
  if (typeof document === 'undefined') return null
  const cookie = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith('content-tracker-language='))

  if (!cookie) return null
  const value = cookie.split('=')[1]
  return value === 'id' || value === 'en' ? value : null
}

function resolveValue(obj: unknown, key: string): string {
  const value = key.split('.').reduce<unknown>((acc, part) => {
    if (typeof acc !== 'object' || acc === null || !(part in acc)) {
      return undefined
    }
    return (acc as Record<string, unknown>)[part]
  }, obj)

  return typeof value === 'string' ? value : key
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = React.useState<LanguageCode>('id')

  React.useEffect(() => {
    const saved = (localStorage.getItem('content-tracker-language') as LanguageCode | null) ?? getCookieLanguage()
    if (saved === 'id' || saved === 'en') {
      setLanguageState(saved)
      document.documentElement.lang = saved
    }
  }, [])

  const setLanguage = React.useCallback((lang: LanguageCode) => {
    setLanguageState(lang)
    localStorage.setItem('content-tracker-language', lang)
    document.cookie = `content-tracker-language=${lang}; path=/; max-age=31536000; samesite=lax`
    document.documentElement.lang = lang
  }, [])

  const t = React.useCallback(
    (key: string) => resolveValue(messages[language], key),
    [language],
  )

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useI18n() {
  const context = React.useContext(LanguageContext)
  if (!context) {
    throw new Error('useI18n must be used inside LanguageProvider')
  }
  return context
}
