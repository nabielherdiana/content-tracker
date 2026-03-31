import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { TaskForm } from '@/features/content/components/TaskForm'
import { fetchCustomFieldDefinitions, fetchTaskById } from '@/lib/actions'
import { getServerLanguage } from '@/lib/i18n/server'

export const metadata = {
  title: 'Edit Task - Content Tracker',
}

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const language = await getServerLanguage()
  const labels = {
    title: language === 'en' ? 'Edit Task' : 'Edit Task',
    subtitle:
      language === 'en'
        ? 'Update brief, deadline, status, and other task details.'
        : 'Perbarui brief, deadline, status, dan detail task lainnya.',
  }

  const [{ data: task }, { data: customFields }] = await Promise.all([
    fetchTaskById(id),
    fetchCustomFieldDefinitions(),
  ])

  if (!task) {
    notFound()
  }

  return (
    <div className="max-w-5xl mx-auto w-full space-y-8">
      <div className="flex items-center gap-4">
        <Link href={`/tasks/${id}`} className="p-2 -ml-2 rounded-full hover:bg-muted/50 text-muted-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{labels.title}</h1>
          <p className="text-sm text-muted-foreground">{labels.subtitle}</p>
        </div>
      </div>

      <TaskForm mode="edit" initialData={task} customFields={customFields} />
    </div>
  )
}
