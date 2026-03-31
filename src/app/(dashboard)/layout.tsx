import { AppShell } from '@/components/shared/AppShell'

export const metadata = {
  title: 'Content Tracker',
  description: 'Manage your content seamlessly',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}
