import { CustomFieldsSettings } from '@/features/custom-fields/CustomFieldsSettings'
import { AppearanceSettings } from '@/features/settings/components/AppearanceSettings'
import { fetchCustomFieldDefinitions } from '@/lib/actions'
import { getServerMessages } from '@/lib/i18n/server'

export const metadata = {
  title: 'Pengaturan - Content Tracker',
}

export default async function SettingsPage() {
  const [m, { data: customFields }] = await Promise.all([getServerMessages(), fetchCustomFieldDefinitions()])

  return (
    <div className="max-w-6xl mx-auto w-full space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{m.settings.title}</h1>
        <p className="text-muted-foreground">{m.settings.subtitle}</p>
      </div>

      <AppearanceSettings />
      <CustomFieldsSettings initialFields={customFields} />
    </div>
  )
}
