import { TaskForm } from '@/features/content/components/TaskForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { fetchCustomFieldDefinitions } from '@/lib/actions'
import { getServerMessages } from '@/lib/i18n/server'

export const metadata = {
  title: 'Buat Task Baru - Content Tracker',
}

export default async function CreateTaskPage() {
  const [m, { data: customFields }] = await Promise.all([getServerMessages(), fetchCustomFieldDefinitions()])

  return (
    <div className="max-w-5xl mx-auto w-full space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/tasks" className="p-2 -ml-2 rounded-full hover:bg-muted/50 text-muted-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{m.tasks.createTitle}</h1>
          <p className="text-sm text-muted-foreground">{m.tasks.createSubtitle}</p>
        </div>
      </div>

      <TaskForm mode="create" customFields={customFields} />
    </div>
  )
}
