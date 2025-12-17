import { getCurrentUser } from '@/actions/auth'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { logout } from '@/actions/auth'
import Link from 'next/link'
import { ArrowLeft, LogOut } from 'lucide-react'

export default async function POSLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Top Header Bar */}
      <header className="flex h-14 items-center justify-between border-b bg-card px-4 shadow-sm">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="hidden md:block">
            <span className="text-sm font-medium text-muted-foreground">
              Point of Sale
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex md:items-center md:space-x-2">
            <span className="text-sm text-muted-foreground">
              {user.fullName}
            </span>
            <span className="text-sm text-muted-foreground">•</span>
            <span className="text-sm font-medium">{user.role}</span>
          </div>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">Logout</span>
            </Button>
          </form>
        </div>
      </header>

      {/* Full Screen Content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  )
}

