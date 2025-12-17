'use client'

import { useEffect, useState } from 'react'
import type { PermissionStructure } from '@/actions/roles'

interface SessionUser {
  id: string
  username: string
  fullName: string
  email?: string
  role: string
  roleId?: string | null
  roleName?: string | null
  permissions?: PermissionStructure | null
}

interface UsePermissionReturn {
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canAccess?: boolean
  canDiscount?: boolean
  canVoid?: boolean
  canRefund?: boolean
  canAdjust?: boolean
  canExport?: boolean
  isLoading: boolean
  permissions: PermissionStructure | null
  hasPermission: (module: string, action: string) => boolean
}

/**
 * Custom hook to check user permissions for a specific module
 * @param module - The module name (e.g., 'products', 'sales', 'pos')
 * @returns Permission flags and loading state
 */
export function usePermission(module?: keyof PermissionStructure): UsePermissionReturn {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchSession() {
      try {
        const response = await fetch('/api/auth/session')
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Error fetching session:', error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSession()
  }, [])

  const permissions = user?.permissions || null

  // Helper function to check permissions
  const hasPermission = (moduleName: string, action: string): boolean => {
    // Super Admin bypass
    if (user?.roleName === 'Super Admin') {
      return true
    }

    if (!permissions || !permissions[moduleName as keyof PermissionStructure]) {
      return false
    }

    const modulePerms = permissions[moduleName as keyof PermissionStructure] as any
    return modulePerms[action] === true
  }

  // If module is provided, return specific permissions for that module
  if (module) {
    return {
      canView: hasPermission(module, 'view'),
      canCreate: hasPermission(module, 'create'),
      canEdit: hasPermission(module, 'edit') || hasPermission(module, 'access'),
      canDelete: hasPermission(module, 'delete'),
      canAccess: hasPermission(module, 'access'),
      canDiscount: hasPermission(module, 'discount'),
      canVoid: hasPermission(module, 'void'),
      canRefund: hasPermission(module, 'refund'),
      canAdjust: hasPermission(module, 'adjust'),
      canExport: hasPermission(module, 'export'),
      isLoading,
      permissions,
      hasPermission,
    }
  }

  // Return generic permission checker if no module specified
  return {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    isLoading,
    permissions,
    hasPermission,
  }
}
