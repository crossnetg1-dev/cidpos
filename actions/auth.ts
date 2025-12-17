'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createSession, deleteSession, verifyPassword, hashPassword } from '@/lib/auth'
import { loginSchema } from '@/lib/validations'

export async function login(formData: FormData) {
  const rawFormData = {
    username: formData.get('username') as string,
    password: formData.get('password') as string,
    rememberMe: formData.get('rememberMe') === 'on',
  }

  // Validate input
  const validatedFields = loginSchema.safeParse(rawFormData)

  if (!validatedFields.success) {
    return {
      error: 'Invalid input. Please check your username and password.',
    }
  }

  const { username, password } = validatedFields.data

  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { username },
    })

    if (!user) {
      // Log failed login attempt (only if system user exists)
      try {
        const systemUser = await prisma.user.findUnique({
          where: { username: 'system' },
        })
        
        if (systemUser) {
          await prisma.activityLog.create({
            data: {
              userId: systemUser.id,
              activityType: 'LOGIN',
              entityType: 'User',
              description: `Failed login attempt for username: ${username}`,
            },
          })
        }
      } catch (error) {
        // Silently ignore if logging fails
      }

      return {
        error: 'Invalid username or password.',
      }
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      return {
        error: 'Your account is inactive. Please contact administrator.',
      }
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password)

    if (!isValidPassword) {
      // Log failed login attempt
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          activityType: 'LOGIN',
          entityType: 'User',
          description: `Failed login attempt for user: ${user.username}`,
        },
      })

      return {
        error: 'Invalid username or password.',
      }
    }

    // Create session
    await createSession(user.id)

    // Log successful login
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        activityType: 'LOGIN',
        entityType: 'User',
        description: `User logged in: ${user.username}`,
      },
    })

    // Check user permissions to determine redirect destination
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

    revalidatePath('/')
    redirect(redirectPath)
  } catch (error) {
    console.error('Login error:', error)
    return {
      error: 'An error occurred during login. Please try again.',
    }
  }
}

export async function logout() {
  const { getSession: getSessionFromAuth } = await import('@/lib/auth')
  const session = await getSessionFromAuth()
  
  if (session) {
    // Log logout
    await prisma.activityLog.create({
      data: {
        userId: session.userId,
        activityType: 'LOGOUT',
        entityType: 'User',
        description: `User logged out: ${session.username}`,
      },
    }).catch(console.error)
  }

  await deleteSession()
  revalidatePath('/')
  redirect('/login')
}

export async function getSession() {
  const { getSession: getSessionFromAuth } = await import('@/lib/auth')
  return getSessionFromAuth()
}

export async function getCurrentUser() {
  const session = await getSession()
  
  if (!session) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      roleId: true,
      status: true,
      lastLoginAt: true,
      roleRelation: {
        select: {
          id: true,
          name: true,
          permissions: true,
        },
      },
    },
  })

  return user
}

