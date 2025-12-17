'use server'

import { getSession } from '@/lib/auth'
import { verifyPassword } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Verify the current logged-in admin's password
 * @param password - Plain text password to verify
 * @returns true if password is correct, throws error if incorrect
 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    const session = await getSession()
    if (!session) {
      throw new Error('Unauthorized. Please log in again.')
    }

    // Fetch user from database to get hashed password
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        password: true,
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Verify password using bcrypt
    const isValid = await verifyPassword(password, user.password)

    if (!isValid) {
      throw new Error('Incorrect Password')
    }

    return true
  } catch (error: any) {
    // Re-throw the error with the same message
    throw new Error(error.message || 'Password verification failed')
  }
}

