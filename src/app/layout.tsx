import type { Metadata } from 'next'
import { AppProviders } from '@/components/providers/AppProviders'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Content Tracker',
  description: 'Dashboard AI-powered untuk mengelola konten dan task content creator secara efisien.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AppProviders>
          {children}
          <Toaster richColors position="top-right" closeButton />
        </AppProviders>
      </body>
    </html>
  )
}
