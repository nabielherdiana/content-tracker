'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  ListTodo,
  PlusCircle,
  Settings,
  Menu,
  Search,
  LogOut,
  Wand2,
  Sparkles,
  Globe,
  Sun,
  Moon,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/components/providers/LanguageProvider'
import { updateProfilePreferences } from '@/lib/actions'
import { cn } from '@/lib/utils'

type NavLink = {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

type UserSummary = {
  name: string
  email: string
}

function getUserInitials(name: string, email: string): string {
  const source = name.trim() || email.trim()
  if (!source) return 'U'
  const words = source.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

function NavItems({
  links,
  pathname,
  onNavigate,
  onLogout,
  logoutLabel,
  user,
  language,
}: {
  links: NavLink[]
  pathname: string
  onNavigate: () => void
  onLogout: () => void
  logoutLabel: string
  user: UserSummary
  language: 'id' | 'en'
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 py-4 space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {link.title}
            </Link>
          )
        })}
      </div>

      <div className="p-4 mt-auto border-t border-border/50 space-y-2.5">
        <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-full bg-primary/12 text-primary flex items-center justify-center text-xs font-semibold">
              {getUserInitials(user.name, user.email)}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="text-[13px] font-semibold leading-4 text-foreground whitespace-normal break-words"
                title={user.name}
              >
                {user.name}
              </p>
              <p
                className="mt-1 text-[11px] leading-4 text-muted-foreground whitespace-normal break-all"
                title={user.email}
              >
                {user.email}
              </p>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={onLogout}
          aria-label={language === 'en' ? 'Logout from your account' : 'Keluar dari akun'}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {logoutLabel}
        </Button>
      </div>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = React.useState(false)
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const [topbarSearch, setTopbarSearch] = React.useState('')
  const [userSummary, setUserSummary] = React.useState<UserSummary>({
    name: 'User',
    email: '-',
  })
  const [, startTransition] = React.useTransition()
  const { theme, setTheme } = useTheme()
  const { language, setLanguage, t } = useI18n()
  const supabase = React.useMemo(() => createClient(), [])

  const navLinks: NavLink[] = [
    { title: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { title: t('nav.tasks'), href: '/tasks', icon: ListTodo },
    { title: t('nav.aiImport'), href: '/ai-import', icon: Wand2 },
    { title: t('nav.settings'), href: '/settings', icon: Settings },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleLanguage = (value: 'id' | 'en') => {
    setLanguage(value)
    startTransition(() => {
      router.refresh()
    })
    void updateProfilePreferences({ language: value })
  }

  const handleTheme = (value: 'light' | 'dark' | 'system') => {
    setTheme(value)
    void updateProfilePreferences({ theme: value })
  }

  React.useEffect(() => {
    const saved = localStorage.getItem('content-tracker-sidebar-collapsed')
    if (saved === '1') {
      setIsDesktopSidebarCollapsed(true)
    }

    setMounted(true)

    const prefetchRoutes = () => {
      router.prefetch('/dashboard')
      router.prefetch('/tasks')
      router.prefetch('/ai-import')
      router.prefetch('/settings')
    }

    const timeoutId = window.setTimeout(prefetchRoutes, 500)
    return () => window.clearTimeout(timeoutId)
  }, [router])

  React.useEffect(() => {
    let mountedFlag = true

    void supabase.auth.getUser().then(({ data }) => {
      if (!mountedFlag || !data.user) return

      const nameFromMeta =
        (typeof data.user.user_metadata?.full_name === 'string' && data.user.user_metadata.full_name) ||
        (typeof data.user.user_metadata?.name === 'string' && data.user.user_metadata.name) ||
        ''
      const derivedName = nameFromMeta.trim() || data.user.email?.split('@')[0] || 'User'
      const email = data.user.email ?? '-'

      setUserSummary({
        name: derivedName,
        email,
      })
    })

    return () => {
      mountedFlag = false
    }
  }, [supabase.auth])

  const toggleDesktopSidebar = React.useCallback(() => {
    setIsDesktopSidebarCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('content-tracker-sidebar-collapsed', next ? '1' : '0')
      return next
    })
  }, [])

  React.useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q') ?? ''
    setTopbarSearch(q)
  }, [pathname])

  const runGlobalSearch = React.useCallback(() => {
    const q = topbarSearch.trim()
    const destination = q ? `/tasks?q=${encodeURIComponent(q)}` : '/tasks'
    startTransition(() => {
      router.push(destination)
    })
  }, [router, startTransition, topbarSearch])

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside
        className={cn(
          'hidden lg:flex flex-col w-64 border-r border-border/50 bg-card fixed inset-y-0 z-40 shadow-sm transition-all duration-200',
          isDesktopSidebarCollapsed && '-translate-x-full opacity-0 pointer-events-none',
        )}
      >
        <div className="h-16 flex items-center px-6 border-b border-border/50">
          <Link href="/dashboard" className="flex items-center gap-2.5 font-bold text-lg tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            {t('appName')}
          </Link>
        </div>
        <div className="flex-1 px-3 py-2 overflow-y-auto">
          <NavItems
            links={navLinks}
            pathname={pathname}
            onNavigate={() => setIsOpen(false)}
            onLogout={handleLogout}
            logoutLabel={t('nav.logout')}
            user={userSummary}
            language={language}
          />
        </div>
      </aside>

      <div
        className={cn(
          'flex-1 flex flex-col w-full relative transition-[padding] duration-200',
          isDesktopSidebarCollapsed ? 'lg:pl-0' : 'lg:pl-64',
        )}
      >
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/50 bg-card/80 backdrop-blur-md px-4 sm:px-6 shadow-sm shadow-black/5">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="hidden lg:inline-flex h-9 w-9"
              onClick={toggleDesktopSidebar}
              aria-label={isDesktopSidebarCollapsed ? (language === 'en' ? 'Show sidebar' : 'Tampilkan sidebar') : (language === 'en' ? 'Hide sidebar' : 'Sembunyikan sidebar')}
              title={isDesktopSidebarCollapsed ? (language === 'en' ? 'Show sidebar' : 'Tampilkan sidebar') : (language === 'en' ? 'Hide sidebar' : 'Sembunyikan sidebar')}
            >
              {isDesktopSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" />}>
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 border-r-0" aria-describedby={undefined}>
                <SheetHeader className="h-16 flex items-center justify-center border-b border-border/50 px-6">
                  <SheetTitle className="flex items-center gap-2 font-bold !mt-0">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {t('appName')}
                  </SheetTitle>
                </SheetHeader>
                <div className="px-3 py-2 h-[calc(100vh-4rem)] overflow-y-auto">
                  <NavItems
                    links={navLinks}
                    pathname={pathname}
                    onNavigate={() => setIsOpen(false)}
                    onLogout={handleLogout}
                    logoutLabel={t('nav.logout')}
                    user={userSummary}
                    language={language}
                  />
                </div>
              </SheetContent>
            </Sheet>

            <div className="hidden sm:flex items-center relative w-64 md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('common.searchPlaceholder')}
                className="w-full bg-muted/50 pl-9 border-none focus-visible:ring-1 shadow-sm h-9 rounded-full"
                value={topbarSearch}
                onChange={(event) => setTopbarSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    runGlobalSearch()
                  }
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="icon" className="h-9 w-9" />}>
                <Globe className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{t('language.label')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleLanguage('id')} className={language === 'id' ? 'font-semibold' : ''}>
                    Bahasa Indonesia
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleLanguage('en')} className={language === 'en' ? 'font-semibold' : ''}>
                    English
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="icon" className="h-9 w-9" />}>
                {!mounted ? (
                  <Monitor className="w-4 h-4" />
                ) : theme === 'dark' ? (
                  <Moon className="w-4 h-4" />
                ) : theme === 'light' ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Monitor className="w-4 h-4" />
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{t('theme.label')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleTheme('light')}>{t('theme.light')}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleTheme('dark')}>{t('theme.dark')}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleTheme('system')}>{t('theme.system')}</DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href="/tasks/create">
              <Button size="sm" className="flex items-center gap-2 rounded-full shadow-sm hover:shadow-md transition-shadow">
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.newTask')}</span>
              </Button>
            </Link>
          </div>
        </header>

        <main className="flex-1 w-full bg-background relative overflow-x-hidden p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
