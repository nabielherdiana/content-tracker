import { LoginForm } from '@/features/auth/components/LoginForm'

export const metadata = {
  title: 'Login - Content Tracker',
  description: 'Masuk ke Content Tracker',
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <div className="w-full relative">
        <div className="absolute inset-0 max-w-lg mx-auto bg-primary/5 blur-[80px] rounded-full h-[50%] -z-10 translate-y-[50%] pointer-events-none" />
        <LoginForm />
      </div>
    </div>
  )
}
