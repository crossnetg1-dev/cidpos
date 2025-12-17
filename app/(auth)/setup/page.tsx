import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SetupForm } from '@/components/auth/setup-form'
import { isSystemInitialized } from '@/actions/setup'
import { redirect } from 'next/navigation'
import { Settings, Store } from 'lucide-react'

export default async function SetupPage() {
  // Check if system is already initialized
  const initialized = await isSystemInitialized()

  if (initialized) {
    // System already initialized, redirect to login
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary p-3">
              <Settings className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Welcome to POS System</CardTitle>
          <CardDescription className="text-lg">
            Let&apos;s set up your system. This will only take a minute.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SetupForm />
        </CardContent>
      </Card>
    </div>
  )
}

