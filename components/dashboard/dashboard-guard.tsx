'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePermission } from '@/hooks/use-permission'
import { Loader2 } from 'lucide-react'

interface DashboardGuardProps {
  children: React.ReactNode
}

/**
 * Client-side guard component that protects the Dashboard page
 * Redirects users without dashboard.view permission to /pos
 */
export function DashboardGuard({ children }: DashboardGuardProps) {
  const { hasPermission, isLoading } = usePermission()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      // If user CANNOT view dashboard, redirect them to POS immediately
      if (!hasPermission('dashboard', 'view')) {
        router.replace('/pos')
      }
    }
  }, [isLoading, hasPermission, router])

  // Show loading state while checking permissions
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // If user doesn't have permission, don't render children (redirect will happen)
  if (!hasPermission('dashboard', 'view')) {
    return null
  }

  // User has permission, render children
  return <>{children}</>
}

