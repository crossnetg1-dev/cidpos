'use server'

import { getSession } from '@/lib/auth'
import { getUserPermissions, hasPermission as checkPermission } from '@/actions/roles'
import type { PermissionStructure } from '@/actions/roles'

/**
 * Get current user's permissions (server-side)
 */
export async function getCurrentUserPermissions(): Promise<PermissionStructure | null> {
  try {
    const session = await getSession()
    if (!session) {
      return null
    }

    return await getUserPermissions(session.userId)
  } catch (error) {
    console.error('Error getting user permissions:', error)
    return null
  }
}

/**
 * Check if current user has permission (server-side)
 */
export async function checkUserPermission(
  module: keyof PermissionStructure,
  action: string
): Promise<boolean> {
  try {
    const session = await getSession()
    if (!session) {
      return false
    }

    return await checkPermission(session.userId, module, action)
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}
