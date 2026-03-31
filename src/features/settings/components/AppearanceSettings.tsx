'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Palette, Languages } from 'lucide-react'
import { useI18n } from '@/components/providers/LanguageProvider'
import { updateProfilePreferences } from '@/lib/actions'
import { toast } from 'sonner'

export function AppearanceSettings() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { language, setLanguage, t } = useI18n()
  const [isPending, startTransition] = React.useTransition()

  const handleThemeChange = (value: string | null) => {
    if (!value) return
    if (value !== 'light' && value !== 'dark' && value !== 'system') return
    setTheme(value)
    startTransition(async () => {
      const res = await updateProfilePreferences({ theme: value })
      if (res.error) {
        toast.error(res.error)
      }
    })
  }

  const handleLanguageChange = (value: string | null) => {
    if (!value) return
    if (value !== 'id' && value !== 'en') return
    setLanguage(value)
    router.refresh()
    startTransition(async () => {
      const res = await updateProfilePreferences({ language: value })
      if (res.error) {
        toast.error(res.error)
      }
    })
  }

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader>
        <CardTitle>{t('settings.appearance')}</CardTitle>
        <CardDescription>
          {language === 'en'
            ? 'Set your preferred language and theme mode.'
            : 'Atur bahasa tampilan dan mode tema sesuai preferensi Anda.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Languages className="w-4 h-4" />
            {t('language.label')}
          </label>
          <Select value={language} onValueChange={handleLanguageChange} disabled={isPending}>
            <SelectTrigger className="bg-muted/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="id">{t('language.id')}</SelectItem>
              <SelectItem value="en">{t('language.en')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Palette className="w-4 h-4" />
            {t('theme.label')}
          </label>
          <Select value={theme ?? 'system'} onValueChange={handleThemeChange} disabled={isPending}>
            <SelectTrigger className="bg-muted/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">{t('theme.light')}</SelectItem>
              <SelectItem value="dark">{t('theme.dark')}</SelectItem>
              <SelectItem value="system">{t('theme.system')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
