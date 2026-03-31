import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sparkles, ArrowRight, LayoutDashboard } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-3xl w-full rounded-3xl border border-border/60 bg-card shadow-lg shadow-black/5 p-8 md:p-12">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4" />
          Content Tracker
        </div>

        <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
          Dashboard kerja konten yang rapi, cepat, dan siap volume tinggi.
        </h1>
        <p className="mt-4 text-muted-foreground text-base md:text-lg max-w-2xl">
          Kelola hingga puluhan konten per bulan, parsing brief pakai AI, track deadline, custom field dinamis, dan workflow yang scalable.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login">
            <Button size="lg" className="shadow-sm hover:shadow-md transition-shadow">
              Login dengan Google
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="outline">
              <LayoutDashboard className="mr-2 w-4 h-4" />
              Lihat Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
