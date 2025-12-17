import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShoppingCart } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getSession } from '@/actions/auth'
import { LoginForm } from '@/components/auth/login-form'
import { isSystemInitialized } from '@/actions/setup'

export default async function LoginPage() {
  // Check if system is initialized (has users)
  const initialized = await isSystemInitialized()

  if (!initialized) {
    // No users exist, redirect to setup
    redirect('/setup')
  }

  // Only check for valid session - if invalid, middleware will handle clearing it
  // This prevents redirect loops
  const session = await getSession()
  
  // Only redirect if we have a truly valid session
  if (session) {
    redirect('/dashboard')
  }
  
  // If no valid session, just show the login form
  // Don't try to clear cookies here - let middleware handle it

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-0 backdrop-blur-sm bg-white/95">
          <CardHeader className="space-y-3 text-center pb-6">
            <div className="flex justify-center mb-2">
              <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-4 shadow-lg">
                <ShoppingCart className="h-10 w-10 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-base">
              Sign in to access your POS system
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
