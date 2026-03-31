import { AIImportWorkspace } from '@/features/ai-import/components/AIImportWorkspace'
import { fetchTaskTargets } from '@/lib/actions'

export const metadata = {
  title: 'AI Import - Content Tracker',
}

export default async function AIImportPage() {
  const { data: tasks } = await fetchTaskTargets()

  return <AIImportWorkspace tasks={tasks} />
}
