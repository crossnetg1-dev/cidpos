import { redirect } from 'next/navigation'
import { getSession } from '@/actions/auth'
import { getCurrentUser } from '@/actions/auth'
import { prisma } from '@/lib/prisma'

export default async function Home() {
  // Let middleware handle authentication - just check if we have a valid session
  const session = await getSession()
  
  // If no valid session, middleware will redirect to login
  // Don't redirect here to avoid conflicts
  if (!session) {
    // Just redirect to login - middleware will handle invalid cookies
    redirect('/login')
  }

  // Get user with role to check permissions
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }

  // Check if user has dashboard access
  let redirectPath = '/dashboard' // Default to dashboard

  if (user.roleId) {
    const role = await prisma.role.findUnique({
      where: { id: user.roleId },
    })

    if (role) {
      const permissions = JSON.parse(role.permissions) as any
      const canViewDashboard = role.name === 'Super Admin' || permissions?.dashboard?.view === true

      if (!canViewDashboard) {
        // User doesn't have dashboard access, redirect to POS
        redirectPath = '/pos'
      }
    }
  } else {
    // No role assigned, default to POS for safety
    redirectPath = '/pos'
  }

  redirect(redirectPath)
}

