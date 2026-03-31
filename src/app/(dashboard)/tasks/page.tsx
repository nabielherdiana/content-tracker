import { DataTable } from '@/features/content/components/DataTable'
import { Button } from '@/components/ui/button'
import { PlusCircle } from 'lucide-react'
import Link from 'next/link'
import { fetchTasks } from '@/lib/actions'
import { getServerMessages } from '@/lib/i18n/server'

export const metadata = {
  title: 'Daftar Task - Content Tracker',
}

export default async function TasksPage() {
  const [m, { data: tasks }] = await Promise.all([getServerMessages(), fetchTasks()])

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{m.tasks.title}</h1>
          <p className="text-muted-foreground">{m.tasks.subtitle}</p>
        </div>
        <Link href="/tasks/create">
          <Button className="shadow-sm hover:shadow-md transition-shadow">
            <PlusCircle className="mr-2 h-4 w-4" />
            {m.nav.newTask}
          </Button>
        </Link>
      </div>

      <DataTable data={tasks} />
    </div>
  )
}
